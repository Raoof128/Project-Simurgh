"""Versioned local fixture successor; serializes revocation with SQLite effects."""

import importlib.util
import sqlite3
import time
from pathlib import Path
from sqlite3 import connect

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "simurgh_historical_fixture_gateway", ROOT / "tools/hf-containment/gateway.py"
)
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)
PUBLIC, HANDOFF = legacy.PUBLIC, legacy.HANDOFF


class Gateway(legacy.Gateway):
    def __init__(self, root, task):
        if type(task) is not str or task not in ("useful_report", "authorized_handoff"):
            raise ValueError("explicit_task_required")
        super().__init__(root, True, task)

    def revoke(self, token):
        if type(token) is not str:
            raise ValueError("invalid_token")
        with connect(self.db, timeout=2) as db:
            db.execute("BEGIN IMMEDIATE")
            return (
                db.execute(
                    "UPDATE grants SET revoked=1 WHERE token=?", (token,)
                ).rowcount
                == 1
            )

    def handle(self, request):
        if type(request) is dict:
            request = request.copy()
        if (
            type(request) is not dict
            or set(request) != {"token", "run", "tenant", "op", "body"}
            or any(type(x) is not str for x in request.values())
            or any(len(x) > 512 for x in request.values())
        ):
            return {"ok": False, "reason": "schema"}
        try:
            # Both revoke and effect operations acquire the write lock BEFORE reading
            # authority. A successful reply leaves this context only after commit.
            with connect(self.db, timeout=2) as db:
                db.execute("BEGIN IMMEDIATE")
                grant = db.execute(
                    "SELECT run,tenant,audience,expires,revoked FROM grants WHERE token=?",
                    (request["token"],),
                ).fetchone()
                reason = None
                if not grant:
                    reason = "unknown_token"
                elif grant[:3] != ("run-a", "tenant-a", "reports"):
                    reason = "credential_scope"
                elif (request["run"], request["tenant"]) != ("run-a", "tenant-a"):
                    reason = "connection_identity"
                elif grant[3] <= time.monotonic():
                    reason = "expired"
                elif grant[4]:
                    reason = "revoked"
                elif (request["op"], request["body"]) not in self.allowed:
                    reason = "operation_scope"
                db.execute(
                    "INSERT INTO events(operation,accepted,reason) VALUES(?,?,?)",
                    (request["op"], int(reason is None), reason),
                )
                if reason:
                    return {"ok": False, "reason": reason}
                db.execute(
                    "INSERT OR REPLACE INTO effects VALUES(?,?)",
                    (request["op"], request["body"]),
                )
                return {"ok": True}
        except sqlite3.Error:
            # Refuse on busy/storage errors; do not manufacture success or effect evidence.
            return {"ok": False, "reason": "storage_unavailable"}
