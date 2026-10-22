"""Trusted local authority and conservative remote-effect reconciliation."""

import hashlib
import json
import sqlite3
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
IDENTITY = {"run", "principal", "tenant"}
CONTROLS = ("enforced", "bypass", "deny_all")


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def unique(pairs):
    result = {}
    for k, v in pairs:
        if k in result:
            raise ValueError("duplicate_key")
        result[k] = v
    return result


def decode(value):
    if len(value) > 16384:
        raise ValueError("oversized_message")
    return json.loads(
        value,
        object_pairs_hook=unique,
        parse_constant=lambda _: (_ for _ in ()).throw(ValueError("nonfinite")),
    )


def valid(action):
    return (
        type(action) is dict
        and set(action) == FIELDS
        and all(type(x) is str and 0 < len(x) <= 512 for x in action.values())
        and action["operation"] == "send_report"
    )


def key_for(action):
    return hashlib.sha256(
        encode({k: action[k] for k in (*sorted(IDENTITY), "id")}).encode()
    ).hexdigest()


class Host:
    def __init__(self, path, client):
        self.path, self.client = Path(path), client
        if not self.path.is_file():
            raise ValueError("missing_host_state")

    @classmethod
    def create(cls, path, client, *, identity, approved, control):
        if (
            control not in CONTROLS
            or type(identity) is not dict
            or set(identity) != IDENTITY
            or not all(type(v) is str and 0 < len(v) <= 512 for v in identity.values())
            or (
                approved is not None
                and (
                    not valid(approved)
                    or any(approved[k] != identity[k] for k in IDENTITY)
                )
            )
        ):
            raise ValueError("invalid_host_configuration")
        path = Path(path)
        with path.open("xb"):
            pass
        with sqlite3.connect(path) as db:
            db.executescript("""
                CREATE TABLE policy(identity TEXT, approved TEXT, control TEXT, revoked INTEGER);
                CREATE TABLE intents(key TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL);
            """)
            db.execute(
                "INSERT INTO policy VALUES(?,?,?,0)",
                (encode(identity), encode(approved), control),
            )
        return cls(path, client)

    def allowed(self, db, action):
        identity, approved, control, revoked = db.execute(
            "SELECT * FROM policy"
        ).fetchone()
        return control == "bypass" or (
            control == "enforced"
            and not revoked
            and all(action[k] == decode(identity)[k] for k in IDENTITY)
            and encode(action) == approved
        )

    def revoke(self):
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE policy SET revoked=1")

    def dispatch(self, action, *, retry=False):
        if not valid(action):
            return {"status": "invalid"}
        action = dict(action)
        key, payload = key_for(action), encode(action)
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            if not self.allowed(db, action):
                return {"status": "blocked"}
            existing = db.execute(
                "SELECT payload,status FROM intents WHERE key=?", (key,)
            ).fetchone()
            if existing and existing[0] != payload:
                return {"status": "blocked"}
            if existing and (existing[1] == "observed" or not retry):
                return {"status": existing[1]}
            db.execute(
                "INSERT OR REPLACE INTO intents VALUES(?,?, 'unknown')", (key, payload)
            )
        # Intent is durable BEFORE any network call. Recheck authority under the
        # dispatch/revocation lock; retain the lock through the bounded RPC.
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            if not self.allowed(db, action):
                return {"status": "blocked"}
            try:
                receipt = self.client.send(key, action)
                status = (
                    "observed"
                    if receipt == {"key": key, "action": action}
                    else "unknown"
                )
            except (OSError, ValueError):
                status = "unknown"
            db.execute("UPDATE intents SET status=? WHERE key=?", (status, key))
        return {"status": status}

    def reconcile(self, action):
        if not valid(action):
            return {"status": "invalid"}
        action = dict(action)
        key = key_for(action)
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT payload FROM intents WHERE key=?", (key,)
            ).fetchone()
            if row is None or row[0] != encode(action):
                return {"status": "invalid"}
            try:
                receipt = self.client.lookup(key)
                if receipt == {"key": key, "action": action}:
                    status = "observed"
                elif receipt == {"key": key, "action": None}:
                    status = "not_observed"
                else:
                    status = "unknown"
            except (OSError, ValueError):
                status = "unknown"
            db.execute("UPDATE intents SET status=? WHERE key=?", (status, key))
        return {"status": status}
