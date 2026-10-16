import importlib.util
import sqlite3
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
KEY = "public-test-admin-key-with-32-characters"
TOKEN = "public-test-credential-with-32-characters"
ACTION = {
    "id": "a",
    "run": "run",
    "principal": "alice",
    "tenant": "tenant-a",
    "operation": "send_report",
    "resource": "inbox",
    "content": "Synthetic report",
    "policyRevision": "v1",
}


class StoreTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("service"),
            "credential service implementation must exist",
        )
        from service import Store, key_for

        self.Store = Store
        self.key_for = key_for
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "service.sqlite"
        self.store = Store.create(self.path, "continuous", session_key=KEY)
        self.store.issue("c1", TOKEN, "alice", "tenant-a", "inbox", 200)
        self.session = self.store.login(TOKEN, 600)

    def send(self, action=None, secret=None):
        action = action or ACTION
        return self.store.send(
            secret or self.session["secret"], self.key_for(action), action
        )

    def test_authorized_and_forged_tokens_and_identity(self):
        self.assertEqual(self.store.login("wrong", 600)["status"], "denied")
        self.assertEqual(self.send(secret=TOKEN)["status"], "denied")
        self.assertEqual(self.send(secret=KEY)["status"], "denied")
        for field, value in [
            ("principal", "mallory"),
            ("tenant", "other"),
            ("resource", "other"),
        ]:
            self.assertEqual(
                self.send(dict(ACTION, **{field: value}))["status"], "denied"
            )
        self.assertEqual(self.send()["status"], "observed")

    def test_expiry_boundaries_for_credential_and_session(self):
        self.store.advance(199)
        self.assertEqual(self.send()["status"], "observed")
        self.store.advance(200)
        self.assertEqual(self.send()["status"], "denied")
        self.assertEqual(self.store.login(TOKEN, 600)["status"], "denied")
        with self.assertRaises(ValueError):
            self.store.advance(199)
        with self.assertRaises(ValueError):
            self.store.advance(True)

    def test_snapshot_session_outlives_credential_but_not_session(self):
        with sqlite3.connect(self.path) as db:
            db.execute("UPDATE state SET policy='session_snapshot'")
        self.store.advance(200)
        self.assertEqual(self.send()["status"], "observed")
        self.store.advance(700)
        self.assertEqual(self.send()["status"], "denied")

    def test_revocation_and_session_cancel_are_different(self):
        self.assertEqual(
            self.store.cancel(self.session["session_id"])["status"], "cancelled"
        )
        self.assertEqual(self.send()["status"], "denied")
        self.session = self.store.login(TOKEN, 600)
        self.assertEqual(self.send()["status"], "observed")
        ack = self.store.revoke("c1")
        self.assertEqual(ack["status"], "revoked")
        self.assertGreater(ack["seq"], 0)
        self.assertEqual(self.send()["status"], "denied")
        self.assertEqual(self.store.login(TOKEN, 600)["status"], "denied")

    def test_idempotency_and_conflicts_cannot_overwrite_effect(self):
        self.assertEqual(self.send()["status"], "observed")
        self.assertEqual(self.send()["status"], "observed")
        self.assertEqual(self.send(dict(ACTION, content="changed"))["status"], "denied")
        with sqlite3.connect(self.path) as db:
            self.assertEqual(
                db.execute("SELECT count(*) FROM effects").fetchone()[0], 1
            )
        self.store.revoke("c1")
        self.assertEqual(self.send()["status"], "denied")

    def test_expiry_sampled_after_lock_acquisition(self):
        with sqlite3.connect(self.path) as lock:
            lock.execute("BEGIN IMMEDIATE")
            lock.execute("UPDATE state SET now=200")
            with ThreadPoolExecutor(1) as pool:
                future = pool.submit(self.send)
                lock.commit()
                self.assertEqual(future.result(timeout=5)["status"], "denied")

    def test_admitted_transaction_finishes_before_revoke_ack(self):
        entered = threading.Event()
        release = threading.Event()
        original = self.store.now

        def paused(db):
            entered.set()
            if not release.wait(5):
                raise RuntimeError("barrier timeout")
            return original(db)

        self.store.now = paused
        with ThreadPoolExecutor(2) as pool:
            sending = pool.submit(self.send)
            self.assertTrue(entered.wait(5))
            revoking = pool.submit(self.store.revoke, "c1")
            try:
                self.assertFalse(revoking.done())
            finally:
                release.set()
            self.assertEqual(sending.result(timeout=5)["status"], "observed")
            ack = revoking.result(timeout=5)
        self.store.now = original
        self.assertEqual(self.send(dict(ACTION, id="b"))["status"], "denied")
        with sqlite3.connect(self.path) as db:
            effect_seq = db.execute(
                "SELECT seq FROM events WHERE kind='effect'"
            ).fetchone()[0]
        self.assertLess(effect_seq, ack["seq"])


class HTTPTests(unittest.TestCase):
    def test_real_http_auth_and_lost_ack(self):
        self.assertIsNotNone(
            importlib.util.find_spec("transport"),
            "credential transport implementation must exist",
        )
        from transport import Service, rpc

        with (
            tempfile.TemporaryDirectory() as d,
            Service(Path(d) / "server.sqlite", "continuous", admin_key=KEY) as service,
        ):
            cred = service.issue("c1", "alice", "tenant-a", "inbox", 200, secret=TOKEN)
            client = service.login(cred)
            self.assertIsNotNone(client)
            self.assertEqual(
                rpc(
                    service.url,
                    "/admin/revoke",
                    {"credential_id": "c1"},
                    client.secret,
                )["status"],
                "denied",
            )
            self.assertIsNone(service.login(type(cred)(cred.id, "forged")))
            service.drop_next()
            with self.assertRaises(OSError):
                client.send(ACTION)
            with sqlite3.connect(service.path) as db:
                self.assertEqual(
                    db.execute("SELECT count(*) FROM effects").fetchone()[0], 1
                )
            self.assertEqual(client.send(ACTION)["status"], "observed")
            self.assertEqual(service.revoke("c1")["status"], "revoked")
            self.assertEqual(client.send(dict(ACTION, id="b"))["status"], "denied")


if __name__ == "__main__":
    unittest.main()
