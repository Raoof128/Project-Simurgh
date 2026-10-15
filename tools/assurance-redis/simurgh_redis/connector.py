# SPDX-License-Identifier: AGPL-3.0-or-later
"""Immutable authority, durable intent, conditional Redis write, GET-only reconciliation."""

import fcntl
import hashlib
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager

from simurgh_durable.store import Store, canonical, parse_json, valid_action
from simurgh_durable.store import initialize as initialize_store

from .transport import request


def initialize(root, authority):
    initialize_store(root, authority)
    with Store(root).transaction() as (connection, _):
        connection.execute(
            "CREATE TABLE intents (id TEXT PRIMARY KEY, action TEXT NOT NULL)"
        )
        connection.execute("CREATE TABLE connector (prefix TEXT NOT NULL)")
        connection.execute("INSERT INTO connector VALUES (?)", (uuid.uuid4().hex,))


def key_for(prefix, action):
    return "simurgh:" + prefix + ":" + hashlib.sha256(action["id"].encode()).hexdigest()


def unknown(reason):
    return {
        "status": "error",
        "outcome": "unknown",
        "reason": reason,
        "effectCreated": None,
    }


class Connector:
    def __init__(self, root, endpoint, *, timeout=2):
        self.store = Store(root, timeout=timeout)
        self.endpoint = endpoint
        self.timeout = timeout

    @contextmanager
    def locked(self):
        fd = os.open(self.store.root / "connector.lock", os.O_CREAT | os.O_RDWR, 0o600)
        deadline = time.monotonic() + self.timeout
        try:
            while True:
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError("connector_lock_timeout")
                    time.sleep(0.005)
            yield
        finally:
            os.close(fd)

    def key(self, action):
        with self.store.transaction() as (connection, _):
            prefix = connection.execute("SELECT prefix FROM connector").fetchone()[0]
        return key_for(prefix, action)

    def ledger(self):
        with self.store.transaction() as (connection, _):
            return {
                name: connection.execute("SELECT count(*) FROM " + name).fetchone()[0]
                for name in ("intents", "receipts")
            }

    def execute(self, action):
        if not valid_action(action):
            return {"status": "denied", "reason": "invalid_action"}
        action = parse_json(canonical(action))
        try:
            with self.locked():
                return self._execute(action)
        except (OSError, ValueError, sqlite3.Error):
            return unknown("storage_or_transport_failure")

    def _execute(self, action):
        with self.store.transaction() as (connection, authority):
            if action not in authority["actions"]:
                return {"status": "denied", "reason": "not_authorized"}
            prefix = connection.execute("SELECT prefix FROM connector").fetchone()[0]
            intent = connection.execute(
                "SELECT action FROM intents WHERE id=?", (action["id"],)
            ).fetchone()
            receipt = connection.execute(
                "SELECT action FROM receipts WHERE id=?", (action["id"],)
            ).fetchone()
            if any(
                row and row[0] != canonical(action) for row in (intent, receipt)
            ) or (receipt and not intent):
                return unknown("ledger_conflict")
            fresh = intent is None
            if fresh:
                connection.execute(
                    "INSERT INTO intents VALUES (?, ?)",
                    (action["id"], canonical(action)),
                )
        # The intent has committed before the first byte of a service request is sent.
        key = key_for(prefix, action)
        expected = canonical({"action": action}).encode("utf-8")
        created = False
        if fresh:
            result = request(
                self.endpoint, ["SET", key, expected, "NX"], timeout=self.timeout
            )
            if result not in (b"OK", None):
                return unknown("unexpected_set_response")
            created = result == b"OK"
        value = request(self.endpoint, ["GET", key], timeout=self.timeout)
        if value is None:
            return unknown(
                "completed_effect_missing" if receipt else "pending_effect_absent"
            )
        if value != expected:
            return unknown("effect_conflict")
        with self.store.transaction() as (connection, _):
            connection.execute(
                "INSERT OR IGNORE INTO receipts VALUES (?, ?)",
                (action["id"], canonical(action)),
            )
        return {
            "status": "executed",
            "outcome": "completed",
            "effectCreated": created,
            "disposition": "created"
            if created
            else "replayed"
            if receipt
            else "recovered",
            "event": {"action": action},
        }

    def observe(self):
        try:
            with self.locked(), self.store.transaction() as (connection, authority):
                prefix = connection.execute("SELECT prefix FROM connector").fetchone()[
                    0
                ]
                completed = {
                    row[0] for row in connection.execute("SELECT id FROM receipts")
                }
                effects = []
                for action in authority["actions"]:
                    value = request(
                        self.endpoint,
                        ["GET", key_for(prefix, action)],
                        timeout=self.timeout,
                    )
                    if value is None:
                        if action["id"] in completed:
                            raise ValueError("effect_missing")
                    elif value != canonical({"action": action}).encode("utf-8"):
                        raise ValueError("effect_conflict")
                    else:
                        effects.append({"action": action})
                return {"available": True, "effects": effects}
        except (OSError, ValueError, sqlite3.Error):
            return {"available": False, "reason": "service_or_ledger_unavailable"}
