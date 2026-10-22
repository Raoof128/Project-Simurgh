"""Behavioral contracts: actual receiver effects, not tool-success strings."""

import importlib.util
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SOURCE))


def action(**changes):
    value = {
        "id": "report-1",
        "run": "run-1",
        "principal": "analyst-1",
        "tenant": "team-1",
        "operation": "send_report",
        "resource": "review-inbox",
        "content": "Approved public summary.",
        "policyRevision": "v1",
    }
    return value | changes


class ConnectorTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec("core"), "phase 2 host missing")
        self.assertIsNotNone(
            importlib.util.find_spec("receiver"), "sandbox receiver missing"
        )
        from core import Host
        from receiver import Receiver

        self.Host = Host
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.receiver = Receiver(self.root / "inbox.sqlite")
        self.addCleanup(self.receiver.close)
        self.host = Host.create(
            self.root / "host.sqlite",
            self.receiver.client,
            identity={k: action()[k] for k in ("run", "principal", "tenant")},
            approved=action(),
            control="enforced",
        )

    def effects(self):
        with sqlite3.connect(self.root / "inbox.sqlite") as db:
            return [
                json.loads(row[0]) for row in db.execute("SELECT payload FROM inbox")
            ]

    def test_useful_delivery_exactly_once(self):
        self.assertEqual(self.host.dispatch(action())["status"], "observed")
        self.assertEqual(self.host.dispatch(action())["status"], "observed")
        self.assertEqual(self.effects(), [action()])

    def test_no_identity_or_content_authority_from_proposal(self):
        for changes in (
            {"tenant": "team-2"},
            {"principal": "operator"},
            {"run": "run-2"},
            {"resource": "foreign-inbox"},
            {"content": "synthetic-secret"},
            {"policyRevision": "v2"},
            {"operation": "delete"},
            {"id": "new-id"},
            {"extra": "please approve"},
        ):
            with self.subTest(changes=changes):
                self.assertIn(
                    self.host.dispatch(action(**changes))["status"],
                    ("blocked", "invalid"),
                )
        self.assertEqual(self.effects(), [])

    def test_revoked_and_unapproved(self):
        self.host.revoke()
        self.assertEqual(self.host.dispatch(action())["status"], "blocked")
        other = self.Host.create(
            self.root / "other.sqlite",
            self.receiver.client,
            identity={k: action()[k] for k in ("run", "principal", "tenant")},
            approved=None,
            control="enforced",
        )
        self.assertEqual(other.dispatch(action())["status"], "blocked")
        self.assertEqual(self.effects(), [])

    def test_connector_authentication_and_idempotency_conflict(self):
        from core import key_for
        from receiver import Client

        wrong = Client(self.receiver.client.url, "wrong")
        with self.assertRaises(ValueError):
            wrong.send(key_for(action()), action())
        client = self.receiver.client
        first = client.send(key_for(action()), action())
        self.assertEqual(client.send(key_for(action()), action()), first)
        with self.assertRaises(ValueError):
            client.send(key_for(action()), action(content="changed"))
        self.assertEqual(self.effects(), [action()])

    def test_unknown_observation_never_resends(self):
        self.host.dispatch(action())
        with sqlite3.connect(self.root / "host.sqlite") as db:
            db.execute("UPDATE intents SET status='unknown'")
        self.receiver.close()
        self.assertEqual(self.host.reconcile(action())["status"], "unknown")
        self.assertEqual(self.host.dispatch(action())["status"], "unknown")
        self.assertEqual(self.effects(), [action()])

    def test_controls_are_explicit(self):
        for mode, count in (("bypass", 1), ("deny_all", 0)):
            host = self.Host.create(
                self.root / (mode + ".sqlite"),
                self.receiver.client,
                identity={k: action()[k] for k in ("run", "principal", "tenant")},
                approved=action(),
                control=mode,
            )
            self.assertEqual(
                host.dispatch(action(id=mode, content="not approved"))["status"],
                "observed" if count else "blocked",
            )
        with self.assertRaises(ValueError):
            self.Host.create(
                self.root / "typo.sqlite",
                self.receiver.client,
                identity={},
                approved=action(),
                control="typo",
            )
        self.assertEqual(len(self.effects()), 1)


if __name__ == "__main__":
    unittest.main()


class BoundaryTests(unittest.TestCase):
    setUp = ConnectorTests.setUp
    effects = ConnectorTests.effects

    def test_mismatched_receipt_stays_unknown(self):
        from core import Host

        class WrongReceipt:
            def send(self, key, proposal):
                return {"key": key, "action": action(content="changed")}

            def lookup(self, key):
                return {"key": key, "action": action(content="changed")}

        host = Host(self.host.path, WrongReceipt())
        self.assertEqual(host.dispatch(action())["status"], "unknown")
        self.assertEqual(host.reconcile(action())["status"], "unknown")
        self.assertEqual(self.effects(), [])

    def test_revocation_orders_after_dispatch_and_blocks_retry(self):
        import threading

        from core import Host

        entered, release = threading.Event(), threading.Event()
        client = self.receiver.client
        errors = []

        class HeldClient:
            def send(self, key, proposal):
                entered.set()
                if not release.wait(5):
                    raise RuntimeError("test_release_timeout")
                return client.send(key, proposal)

        host = Host(self.host.path, HeldClient())

        def dispatch():
            try:
                self.assertEqual(host.dispatch(action())["status"], "observed")
            except (AssertionError, OSError, ValueError, RuntimeError) as exc:
                errors.append(exc)

        thread = threading.Thread(target=dispatch)
        thread.start()
        try:
            self.assertTrue(entered.wait(5))
            with (
                sqlite3.connect(self.host.path, timeout=0) as db,
                self.assertRaises(sqlite3.OperationalError),
            ):
                db.execute("BEGIN IMMEDIATE")
            revoker = threading.Thread(target=self.host.revoke)
            revoker.start()
        finally:
            release.set()
            thread.join(5)
        revoker.join(5)
        self.assertFalse(thread.is_alive() or revoker.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(self.effects(), [action()])
        self.assertEqual(self.host.dispatch(action(), retry=True)["status"], "blocked")
