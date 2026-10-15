# SPDX-License-Identifier: AGPL-3.0-or-later
"""Immutable authority and recoverable receipts for an idempotent local file sink."""

import hashlib
import json
import os
import signal
import sqlite3
import stat
import tempfile
from contextlib import contextmanager
from pathlib import Path

FIELDS = {
    "id",
    "run",
    "principal",
    "tenant",
    "operation",
    "resource",
    "content",
    "policyRevision",
}
CRASH_POINTS = ("before_publish", "after_publish", "before_commit", "after_commit")


def canonical(value):
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def parse_json(value):
    def unique(pairs):
        result = {}
        for key, item in pairs:
            if key in result:
                raise ValueError("duplicate_json_key")
            result[key] = item
        return result

    def reject(_):
        raise ValueError("nonfinite_json")

    return json.loads(value, object_pairs_hook=unique, parse_constant=reject)


def valid_action(action):
    if type(action) is not dict or set(action) != FIELDS:
        return False
    if not all(
        type(value) is str and 0 < len(value) <= 256 for value in action.values()
    ):
        return False
    try:
        canonical(action).encode("utf-8")
    except UnicodeEncodeError:
        return False
    return action["operation"] == "write" and action["resource"] in ("patch", "report")


def authority_copy(authority):
    if (
        type(authority) is not dict
        or set(authority) != {"revision", "actions"}
        or type(authority["revision"]) is not str
        or not 0 < len(authority["revision"]) <= 256
        or type(authority["actions"]) is not list
        or not 0 < len(authority["actions"]) <= 100
    ):
        raise ValueError("invalid_authority")
    actions = authority["actions"]
    if not all(
        valid_action(a) and a["policyRevision"] == authority["revision"]
        for a in actions
    ) or len({a["id"] for a in actions}) != len(actions):
        raise ValueError("invalid_authority")
    return parse_json(canonical(authority))


def fsync_directory(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def initialize(root, authority):
    captured = authority_copy(authority)
    root = Path(root).absolute()
    if root.exists() and any(root.iterdir()):
        raise ValueError("store_not_empty")
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    (root / "effects").mkdir(mode=0o700)
    (root / "staging").mkdir(mode=0o700)
    connection = sqlite3.connect(root / "state.sqlite3", isolation_level=None)
    try:
        connection.execute("PRAGMA synchronous=FULL")
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            "CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK(id=1), authority TEXT NOT NULL)"
        )
        connection.execute(
            "CREATE TABLE receipts (id TEXT PRIMARY KEY, action TEXT NOT NULL)"
        )
        connection.execute("INSERT INTO metadata VALUES (1, ?)", (canonical(captured),))
        connection.commit()
    finally:
        connection.close()
    fsync_directory(root)
    fsync_directory(root.parent)


def effect_name(action):
    return hashlib.sha256(action["id"].encode("utf-8")).hexdigest() + ".json"


def crash(point, selected):
    if point == selected:
        os.kill(os.getpid(), signal.SIGKILL)


class Store:
    def __init__(self, root, *, timeout=2):
        self.root = Path(root).absolute()
        self.timeout = timeout

    @contextmanager
    def transaction(self):
        # mode=rw refuses to create a fresh authority database after storage loss.
        uri = (self.root / "state.sqlite3").as_uri() + "?mode=rw"
        connection = sqlite3.connect(
            uri, uri=True, timeout=self.timeout, isolation_level=None
        )
        try:
            connection.execute("PRAGMA synchronous=FULL")
            connection.execute("BEGIN IMMEDIATE")
            rows = connection.execute(
                "SELECT authority FROM metadata WHERE id=1"
            ).fetchall()
            if len(rows) != 1:
                raise ValueError("missing_authority")
            authority = authority_copy(parse_json(rows[0][0]))
            yield connection, authority
            connection.commit()
        except BaseException:
            connection.rollback()
            raise
        finally:
            connection.close()

    def read_effect(self, action):
        path = self.root / "effects" / effect_name(action)
        expected = canonical({"action": action}).encode("utf-8")
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ValueError("effect_conflict")
            with os.fdopen(fd, "rb", closefd=False) as stream:
                # Escaped control characters can expand beyond the character-count bound.
                # One extra byte rejects suffixes while keeping the read schema-bounded.
                content = stream.read(len(expected) + 1)
            if content != expected:
                raise ValueError("effect_conflict")
            return {"action": action}
        finally:
            os.close(fd)

    def execute(self, action, *, crash_at=None):
        if crash_at is not None and crash_at not in CRASH_POINTS:
            raise ValueError("invalid_crash_point")
        if not valid_action(action):
            return {"status": "denied", "reason": "invalid_action"}
        action = parse_json(canonical(action))
        with self.transaction() as (connection, authority):
            if action not in authority["actions"]:
                return {"status": "denied", "reason": "not_authorized"}
            receipt = connection.execute(
                "SELECT action FROM receipts WHERE id=?", (action["id"],)
            ).fetchone()
            if receipt and receipt[0] != canonical(action):
                raise ValueError("receipt_conflict")
            try:
                self.read_effect(action)
                exists = True
            except FileNotFoundError:
                exists = False
            if receipt and not exists:
                raise ValueError("effect_missing")
            created = False
            if not exists:
                crash("before_publish", crash_at)
                fd, temporary = tempfile.mkstemp(
                    prefix="effect-", dir=self.root / "staging"
                )
                try:
                    with os.fdopen(fd, "wb") as stream:
                        stream.write(canonical({"action": action}).encode("utf-8"))
                        stream.flush()
                        os.fsync(stream.fileno())
                    # Exclusive publication; cooperating workers also hold the SQLite writer lock.
                    os.link(temporary, self.root / "effects" / effect_name(action))
                    fsync_directory(self.root / "effects")
                    created = True
                    crash("after_publish", crash_at)
                finally:
                    os.unlink(temporary)
            if not receipt:
                connection.execute(
                    "INSERT INTO receipts VALUES (?, ?)",
                    (action["id"], canonical(action)),
                )
            crash("before_commit", crash_at)
            result = {
                "status": "executed",
                "disposition": "created"
                if created
                else "replayed"
                if receipt
                else "recovered",
                "effectCreated": created,
                "event": {"action": action},
            }
        crash("after_commit", crash_at)
        return result

    def receipts(self):
        with self.transaction() as (connection, _):
            return [
                parse_json(row[0])
                for row in connection.execute("SELECT action FROM receipts ORDER BY id")
            ]

    def snapshot(self):
        try:
            with self.transaction() as (connection, authority):
                permitted = {effect_name(a): a for a in authority["actions"]}
                effects = []
                for path in sorted((self.root / "effects").iterdir()):
                    if path.name not in permitted:
                        raise ValueError("unexpected_effect")
                    effects.append(self.read_effect(permitted[path.name]))
                for (encoded,) in connection.execute("SELECT action FROM receipts"):
                    action = parse_json(encoded)
                    if action not in authority["actions"]:
                        raise ValueError("receipt_conflict")
                    self.read_effect(action)
                return {"available": True, "effects": effects}
        except (OSError, ValueError, sqlite3.Error):
            return {"available": False, "reason": "storage_unavailable"}
