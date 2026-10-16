"""Host-owned exact-action gateway and vault snapshots; no model-visible credentials."""

import fcntl
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from service import encode, key_for, valid
from transport import Credential


class Vault:
    """In-memory lab vault, not encrypted storage. Snapshots retain old credentials."""

    def __init__(self):
        self.values = {}

    def put(self, name, credential):
        if not isinstance(credential, Credential):
            raise TypeError("credential")
        self.values[name] = credential

    def delete(self, name):
        self.values.pop(name, None)

    def snapshot(self, name):
        return self.values[name]


class Gateway:
    def __init__(self, path, client):
        self.path = Path(path)
        self.client = client
        if self.path.is_symlink() or not self.path.is_file():
            raise ValueError("gateway_state")
        with self.db() as db:
            rows = db.execute("SELECT payload FROM config").fetchall()
            if len(rows) != 1:
                raise ValueError("gateway_config")
            self.config = json.loads(rows[0][0])
        binding = client.binding if client else None
        if binding != self.config["binding"]:
            raise ValueError("session_binding")

    @classmethod
    def create(cls, path, client, approved):
        if not valid(approved):
            raise ValueError("approved_action")
        path = Path(path)
        with path.open("xb"):
            pass
        with sqlite3.connect(path) as db:
            db.executescript("""
            CREATE TABLE config(payload TEXT NOT NULL);
            CREATE TABLE state(id INTEGER PRIMARY KEY CHECK(id=1),stopped INTEGER NOT NULL,revocation TEXT NOT NULL,ack_seq INTEGER);
            CREATE TABLE intents(key TEXT PRIMARY KEY,payload TEXT NOT NULL,status TEXT NOT NULL);
            CREATE TABLE events(seq INTEGER PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL);
            """)
            db.execute(
                "INSERT INTO config VALUES(?)",
                (
                    encode(
                        {
                            "approved": approved,
                            "binding": client.binding if client else None,
                        }
                    ),
                ),
            )
            db.execute("INSERT INTO state VALUES(1,0,'not_requested',NULL)")
        return cls(path, client)

    def db(self):
        return sqlite3.connect(self.path, timeout=10)

    @contextmanager
    def admission(self):
        # Same-inode, cross-process lock; SQLite transactions remain short so stop
        # can persist while an admitted RPC is running. Trusted storage is required.
        with self.path.open("rb") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)

    def event(self, db, kind, **data):
        db.execute("INSERT INTO events(kind,payload) VALUES(?,?)", (kind, encode(data)))

    def state(self):
        with self.db() as db:
            stopped, revocation, ack = db.execute(
                "SELECT stopped,revocation,ack_seq FROM state"
            ).fetchone()
        return {"stopped": bool(stopped), "revocation": revocation, "ack_seq": ack}

    def dispatch(self, action):
        with self.admission():
            return self._dispatch(action)

    def _dispatch(self, action):
        if not valid(action):
            return {"status": "blocked"}
        action = dict(action)
        key = key_for(action)
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            if (
                self.client is None
                or encode(action) != encode(self.config["approved"])
                or db.execute("SELECT stopped FROM state").fetchone()[0]
            ):
                self.event(db, "blocked")
                return {"status": "blocked"}
            old = db.execute(
                "SELECT status FROM intents WHERE key=?", (key,)
            ).fetchone()
            if old:
                self.event(db, "cached", status=old[0])
                return {"status": old[0]}
            db.execute(
                "INSERT INTO intents VALUES(?,?,?)", (key, encode(action), "unknown")
            )
            self.event(db, "intent", key=key)
        try:
            reply = self.client.send(action)
            if reply == {"status": "observed", "key": key, "action": action}:
                status = "observed"
            elif (
                type(reply) is dict
                and reply.get("status") == "denied"
                and set(reply) <= {"status", "reason"}
            ):
                status = "denied"
            else:
                status = "unknown"
        except (OSError, ValueError):
            status = "unknown"
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE intents SET status=? WHERE key=?", (status, key))
            self.event(db, "outcome", status=status)
        return {"status": status}

    def revoke(self, revoker):
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE state SET stopped=1,revocation='unknown',ack_seq=NULL")
            self.event(db, "local_stop")
        with self.admission():
            return self._remote_revoke(revoker)

    def _remote_revoke(self, revoker):
        binding = self.config["binding"]
        status = "unknown"
        seq = None
        if binding:
            try:
                reply = revoker(binding["credential_id"])
                if (
                    type(reply) is dict
                    and set(reply) == {"status", "credential_id", "seq", "issuer"}
                    and reply["status"] == "revoked"
                    and reply["credential_id"] == binding["credential_id"]
                    and reply["issuer"] == binding["issuer"]
                    and type(reply["seq"]) is int
                    and reply["seq"] > 0
                ):
                    status = "acknowledged"
                    seq = reply["seq"]
            except (OSError, ValueError):
                pass
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute("UPDATE state SET revocation=?,ack_seq=?", (status, seq))
            self.event(db, "remote_revoke", status=status, ack_seq=seq)
        return {"status": status}
