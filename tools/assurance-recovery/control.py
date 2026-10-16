"""Trusted exact-grant recovery and local stop policy; not model reasoning."""

import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-connector"))
from core import decode, encode, key_for, valid
from workflow import native_delivery

POLICIES = ("baseline", "recover", "stop")


class Controller:
    def __init__(self, host, directory, policy):
        if policy not in POLICIES:
            raise ValueError("invalid_recovery_policy")
        self.host, self.directory, self.policy = host, Path(directory), policy
        self.path = self.directory / "control.sqlite"
        self._grant()
        with sqlite3.connect(self.path) as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS recovery(key TEXT PRIMARY KEY);
                CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, payload TEXT NOT NULL);
            """)

    def _grant(self):
        with sqlite3.connect(self.host.path) as db:
            identity, approved, control, revoked = db.execute(
                "SELECT * FROM policy"
            ).fetchone()
        if control != "enforced":
            raise ValueError("recovery_requires_enforced_host")
        self.identity = decode(identity)
        return decode(approved), bool(revoked)

    def emit(self, kind, **fields):
        event = {
            "type": kind,
            "identity": self.identity,
            "time_ns": time.monotonic_ns(),
            **fields,
        }
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("INSERT INTO events(payload) VALUES(?)", (encode(event),))

    def events(self):
        with sqlite3.connect(self.path) as db:
            return [
                {"seq": seq, **decode(payload)}
                for seq, payload in db.execute(
                    "SELECT seq,payload FROM events ORDER BY seq"
                )
            ]

    def reserve(self, action):
        with sqlite3.connect(self.path, timeout=10) as db:
            changed = db.execute(
                "INSERT OR IGNORE INTO recovery VALUES(?)", (key_for(action),)
            ).rowcount
        if changed:
            self.emit("recovery_reserved", action=action)
        return bool(changed)

    def dispatch(self, action):
        try:
            result = native_delivery(self.host, action, self.directory)
        except (OSError, ValueError, RuntimeError):
            result = {"status": "runtime_error"}
        self.emit("dispatched", action=action, result=result)
        return result["status"]

    def stop(self):
        self.emit("stop_requested")
        self.host.revoke()
        self.emit("revoked")

    def handle(self, proposal):
        if type(proposal) is not dict:
            raise ValueError("invalid_proposal_wrapper")
        status = proposal.get("status")
        if status not in ("call", "invalid", "declined", "generation_error") or set(
            proposal
        ) != ({"status", "action"} if status == "call" else {"status"}):
            raise ValueError("invalid_proposal_wrapper")
        grant, revoked = self._grant()
        self.emit("proposal", proposal=proposal, policy=self.policy)
        if status in ("declined", "generation_error"):
            return {"status": status, "recovery": False}
        if status == "call":
            action = proposal["action"]
            if (
                self.policy == "stop"
                and grant is not None
                and valid(action)
                and encode(action) != encode(grant)
            ):
                self.emit("detected", action=action)
                self.stop()
                return {"status": "blocked", "recovery": False}
            status = self.dispatch(action)
            if status == "unknown":
                result = self.host.reconcile(action)
                self.emit("reconciled", action=action, result=result)
                return {"status": result["status"], "recovery": False}
        if self.policy != "recover" or status not in ("invalid", "blocked"):
            return {"status": status, "recovery": False}
        grant, revoked = self._grant()
        if grant is None or revoked:
            return {"status": status, "recovery": False}
        if not self.reserve(grant):
            return {"status": "recovery_budget_exhausted", "recovery": False}
        # Authority is checked again by the native dispatch, after this trusted read.
        result = self.dispatch(grant)
        if result == "unknown":
            reconciled = self.host.reconcile(grant)
            self.emit("reconciled", action=grant, result=reconciled)
            result = reconciled["status"]
        return {"status": result, "recovery": True}
