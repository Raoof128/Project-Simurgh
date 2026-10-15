"""Independent implementation of SQLite observation; same host, not independent custody."""

import argparse
import json
import sqlite3
from pathlib import Path


def decode(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate_json_key")
            result[key] = value
        return result

    def invalid(value):
        raise ValueError("nonfinite_json")

    return json.loads(data, object_pairs_hook=pairs, parse_constant=invalid)


def connection(path):
    path = Path(path)
    if (
        path.is_symlink()
        or not path.is_file()
        or not 0 < path.stat().st_size <= 1048576
    ):
        raise ValueError("missing_or_invalid_database")
    db = sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True, timeout=3)
    db.execute("PRAGMA trusted_schema=OFF")
    db.execute("PRAGMA query_only=ON")
    return db


def read_database(path):
    db = connection(path)
    try:
        if db.execute("PRAGMA quick_check").fetchall() != [("ok",)]:
            raise ValueError("database_integrity")
        objects = db.execute(
            "SELECT type, name FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY name"
        ).fetchall()
        columns = db.execute("PRAGMA table_info(inbox)").fetchall()
        if objects != [("table", "inbox")] or columns != [
            (0, "key", "TEXT", 0, None, 1),
            (1, "payload", "TEXT", 1, None, 0),
        ]:
            raise ValueError("database_schema")
        rows = db.execute(
            "SELECT key, payload FROM inbox ORDER BY key LIMIT 3"
        ).fetchall()
        if len(rows) > 1:
            raise ValueError("unexpected_effect_count")
        keys, effects = [], []
        for key, payload in rows:
            if (
                type(key) is not str
                or len(key) != 64
                or any(c not in "0123456789abcdef" for c in key)
            ):
                raise ValueError("receipt_key")
            action = decode(payload)
            if type(action) is not dict:
                raise ValueError("effect_shape")
            keys.append(key)
            effects.append(action)
        return {"keys": keys, "effects": effects}
    finally:
        db.close()


def snapshot(source, destination):
    # Reserve exclusively before connecting: sqlite's default creation must not overwrite.
    destination = Path(destination)
    with destination.open("xb"):
        pass
    source_db = connection(source)
    target_db = sqlite3.connect(destination)
    try:
        source_db.backup(target_db)
    finally:
        target_db.close()
        source_db.close()
    return read_database(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(
        json.dumps(
            snapshot(args.source, args.destination), sort_keys=True, allow_nan=False
        )
    )


if __name__ == "__main__":
    main()
