import base64
import hashlib
import hmac
import importlib.util
import sqlite3
import sys
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HERE), str(HERE.parent / "assurance-connector")]
from core import Host, encode
from receiver import Receiver
from study import base_action, observed

SECRET = b"local-fixture-webhook-key-32-bytes"
OPERATOR = b"local-fixture-operator-key-32-byte"


def signed(event_id="evt_test", alert_id="alert_test", *, secret=SECRET, age=0):
    raw = encode(
        {
            "object": "event",
            "id": event_id,
            "type": "safety.alert.created",
            "created_at": 1700000000,
            "data": {"id": alert_id},
        }
    )
    timestamp = str(int(time.time()) - age)
    signature = base64.b64encode(
        hmac.digest(secret, f"{event_id}.{timestamp}.{raw}".encode(), "sha256")
    ).decode()
    return raw, {
        "webhook-id": event_id,
        "webhook-timestamp": timestamp,
        "webhook-signature": "v1," + signature,
    }


class SignalsTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("signals"), "phase6 signals missing"
        )
        from signals import SignalGate

        self.Gate = SignalGate
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.receiver = Receiver(self.root / "receiver.sqlite")
        self.addCleanup(self.receiver.close)
        self.action = base_action()
        self.host = Host.create(
            self.root / "host.sqlite",
            self.receiver.client,
            identity={k: self.action[k] for k in ("run", "principal", "tenant")},
            approved=self.action,
            control="enforced",
        )
        self.now = 100.0
        self.alert = {
            "id": "alert_test",
            "response_id": "resp_test",
            "request_id": "req_test",
            "request_paused": False,
            "reason": None,
        }
        self.lookups = 0

        def lookup(alert_id):
            self.lookups += 1
            if self.alert is None:
                raise OSError("fixture unavailable")
            return self.alert

        self.kw = {
            "project": "proj_test",
            "response_id": "resp_test",
            "request_id": "req_test",
            "webhook_secret": "whsec_" + base64.b64encode(SECRET).decode(),
            "operator_key": OPERATOR,
            "lookup": lookup,
            "clock": lambda: self.now,
            "boot_id": "boot-test",
        }
        self.gate = self.Gate.create(self.root / "gate.sqlite", self.host, **self.kw)

    def token(self, *, revision=None, key=OPERATOR, nonce="review-1"):
        payload = {
            "scope": self.gate.scope,
            "revision": self.gate.state()["revision"] if revision is None else revision,
            "expires": self.now + 30,
            "nonce": nonce,
        }
        return {
            "payload": payload,
            "signature": hmac.new(
                key, encode(payload).encode(), hashlib.sha256
            ).hexdigest(),
        }

    def activate(self):
        self.gate.heartbeat()
        self.assertTrue(self.gate.restart(self.token()))

    def test_default_paused_and_healthy_operator_activation(self):
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.gate.heartbeat()
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.assertTrue(self.gate.restart(self.token()))
        self.assertEqual(self.gate.dispatch(self.action)["status"], "observed")
        self.assertEqual(observed(self.receiver.path), [self.action])

    def test_correlated_alert_stops_even_with_null_reason_and_paused_false(self):
        self.activate()
        self.assertEqual(self.gate.receive(*signed()), "stopped")
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.assertTrue(self.gate.state()["terminal"])
        self.assertEqual(observed(self.receiver.path), [])
        self.assertFalse(self.gate.restart(self.token(nonce="review-2")))
        self.assertEqual(self.gate.receive(*signed()), "stopped")
        self.assertEqual(self.lookups, 1)

    def test_provider_stop_survives_reopen_and_cannot_resume_or_retry(self):
        self.activate()
        self.assertFalse(
            self.gate.provider_error("rate_limit_exceeded", response_id="resp_test")
        )
        self.assertFalse(
            self.gate.provider_error(
                "misalignment_policy_violation", response_id="other"
            )
        )
        self.assertTrue(
            self.gate.provider_error(
                "misalignment_policy_violation", response_id="resp_test"
            )
        )
        reopened = self.Gate(self.root / "gate.sqlite", self.host, **self.kw)
        self.assertTrue(reopened.state()["terminal"])
        reopened.heartbeat()
        self.assertFalse(reopened.restart(self.token(nonce="review-2")))
        self.assertEqual(reopened.dispatch(self.action)["status"], "blocked")

    def test_forged_expired_and_duplicate_key_payloads_are_rejected(self):
        self.activate()
        for args in [signed(secret=OPERATOR), signed(age=1000)]:
            with self.assertRaises(ValueError):
                self.gate.receive(*args)
        raw, headers = signed()
        raw = raw.replace('"object":"event"', '"object":"event","object":"event"')
        stamp = headers["webhook-timestamp"]
        headers["webhook-signature"] = (
            "v1,"
            + base64.b64encode(
                hmac.digest(SECRET, f"evt_test.{stamp}.{raw}".encode(), "sha256")
            ).decode()
        )
        with self.assertRaises(ValueError):
            self.gate.receive(raw, headers)
        self.assertEqual(self.lookups, 0)
        self.assertEqual(self.gate.dispatch(self.action)["status"], "observed")

    def test_pending_alert_holds_dispatch_and_survives_restart_then_resolves(self):
        self.activate()
        detail = self.alert
        self.alert = None
        self.assertEqual(self.gate.receive(*signed()), "pending")
        self.gate = self.Gate(self.root / "gate.sqlite", self.host, **self.kw)
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.assertFalse(self.gate.restart(self.token(nonce="pending")))
        self.alert = detail
        self.assertEqual(self.gate.resolve("evt_test"), "stopped")
        self.assertTrue(self.gate.state()["terminal"])

    def test_wrong_identity_and_missing_identity_are_not_clean_equivalents(self):
        self.activate()
        self.alert.update(response_id="other", request_id="other")
        self.assertEqual(self.gate.receive(*signed()), "unrelated")
        self.assertEqual(self.gate.dispatch(self.action)["status"], "observed")
        self.alert = {
            "id": "alert_next",
            "response_id": None,
            "request_id": None,
            "request_paused": True,
            "reason": None,
        }
        self.assertEqual(
            self.gate.receive(*signed("evt_next", "alert_next")), "pending"
        )
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")

    def test_monitor_expiry_requires_fresh_separate_operator_decision(self):
        self.activate()
        old = self.token(nonce="old")
        self.now += 31
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.gate.heartbeat()
        self.assertFalse(self.gate.restart(old))
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        with self.assertRaises(ValueError):
            self.gate.restart(self.token(key=SECRET))
        token = self.token(nonce="fresh")
        self.assertTrue(self.gate.restart(token))
        self.assertFalse(self.gate.restart(token))
        self.assertEqual(self.gate.dispatch(self.action)["status"], "observed")

    def test_reboot_and_backwards_clock_invalidate_lease(self):
        self.activate()
        self.now -= 1
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.kw["boot_id"] = "another-boot"
        new = self.Gate(self.root / "gate.sqlite", self.host, **self.kw)
        self.assertEqual(new.dispatch(self.action)["status"], "blocked")

    def test_configuration_rebind_and_bypass_are_rejected(self):
        with self.assertRaises(ValueError):
            self.Gate(
                self.root / "gate.sqlite", self.host, **{**self.kw, "project": "other"}
            )
        with sqlite3.connect(self.host.path) as db:
            db.execute("UPDATE policy SET control='bypass'")
        with self.assertRaises(ValueError):
            self.Gate(self.root / "gate.sqlite", self.host, **self.kw)

    def test_event_id_body_collision_and_header_identity_mismatch(self):
        self.activate()
        self.alert["response_id"] = "other"
        self.gate.receive(*signed())
        with self.assertRaises(ValueError):
            self.gate.receive(*signed(alert_id="another"))
        raw, headers = signed("evt_second")
        headers["webhook-id"] = "evt_wrong"
        with self.assertRaises(ValueError):
            self.gate.receive(raw, headers)

    def test_revocation_failure_leaves_durable_stop(self):
        self.activate()

        def fail():
            raise OSError("fixture revoke failure")

        self.host.revoke = fail
        self.assertTrue(
            self.gate.provider_error(
                "misalignment_policy_violation", response_id="resp_test"
            )
        )
        self.assertTrue(self.gate.state()["terminal"])
        self.assertEqual(self.gate.dispatch(self.action)["status"], "blocked")
        self.assertTrue(
            any(e["type"] == "revocation_unknown" for e in self.gate.events())
        )

    def test_host_still_rejects_unapproved_action_and_empty_decision(self):
        self.activate()
        self.assertEqual(
            self.gate.dispatch({**self.action, "resource": "foreign"})["status"],
            "blocked",
        )
        with self.assertRaises(ValueError):
            self.gate.restart({})
        self.assertEqual(observed(self.receiver.path), [])


if __name__ == "__main__":
    unittest.main()
