import importlib.util
import sqlite3
import sys
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import test_service as fixtures


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("gateway"),
            "credential gateway implementation must exist",
        )
        from gateway import Gateway, Vault
        from transport import Service

        self.Gateway, self.Vault = Gateway, Vault
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.service = Service(
            self.path / "service.sqlite",
            "continuous",
            admin_key=fixtures.KEY,
            issuer="issuer-a",
        )
        self.addCleanup(self.service.close)
        self.credential = self.service.issue(
            "c1", "alice", "tenant-a", "inbox", 200, secret=fixtures.TOKEN
        )
        self.client = self.service.login(self.credential)
        self.gate = Gateway.create(
            self.path / "gate.sqlite", self.client, fixtures.ACTION
        )

    def test_exact_action_no_secret_in_durable_gateway(self):
        self.assertEqual(
            self.gate.dispatch(dict(fixtures.ACTION, content="unapproved"))["status"],
            "blocked",
        )
        self.assertEqual(self.gate.dispatch(fixtures.ACTION)["status"], "observed")
        raw = (self.path / "gate.sqlite").read_bytes()
        for secret in (fixtures.KEY, fixtures.TOKEN, self.client.secret):
            self.assertNotIn(secret.encode(), raw)

    def test_vault_delete_and_rotation_leave_existing_snapshot(self):
        vault = self.Vault()
        vault.put("provider", self.credential)
        old = vault.snapshot("provider")
        second = self.service.issue(
            "c2",
            "alice",
            "tenant-a",
            "inbox",
            300,
            secret="second-public-credential-with-32-characters",
        )
        vault.put("provider", second)
        self.assertEqual(vault.snapshot("provider"), second)
        vault.delete("provider")
        with self.assertRaises(KeyError):
            vault.snapshot("provider")
        self.assertEqual(old, self.credential)
        self.assertIsNotNone(self.service.login(old))

    def test_lost_ack_retains_unknown_without_resend(self):
        self.service.drop_next()
        self.assertEqual(self.gate.dispatch(fixtures.ACTION)["status"], "unknown")
        self.gate = self.Gateway(self.path / "gate.sqlite", self.client)
        self.assertEqual(self.gate.dispatch(fixtures.ACTION)["status"], "unknown")
        with sqlite3.connect(self.service.path) as db:
            self.assertEqual(
                db.execute("SELECT count(*) FROM effects").fetchone()[0], 1
            )
            self.assertEqual(
                db.execute(
                    "SELECT count(*) FROM events WHERE kind='duplicate'"
                ).fetchone()[0],
                0,
            )

    def test_local_stop_survives_remote_revocation_outage(self):
        self.service.close()
        self.assertEqual(self.gate.revoke(self.service.revoke)["status"], "unknown")
        self.gate = self.Gateway(self.path / "gate.sqlite", self.client)
        self.assertEqual(self.gate.dispatch(fixtures.ACTION)["status"], "blocked")
        self.assertEqual(
            self.gate.state(),
            {"stopped": True, "revocation": "unknown", "ack_seq": None},
        )

    def test_matching_ack_and_wrong_issuer_ack(self):
        bad = lambda cid: {
            "status": "revoked",
            "credential_id": cid,
            "issuer": "other",
            "seq": 1,
        }
        self.assertEqual(self.gate.revoke(bad)["status"], "unknown")
        self.assertEqual(
            self.gate.revoke(self.service.revoke)["status"], "acknowledged"
        )
        self.assertEqual(self.gate.dispatch(fixtures.ACTION)["status"], "blocked")

    def test_session_rebinding_to_other_issuer_is_rejected(self):
        with self.assertRaises(ValueError):
            self.Gateway(
                self.path / "gate.sqlite", replace(self.client, issuer="issuer-b")
            )


if __name__ == "__main__":
    unittest.main()
