import importlib.util
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(HERE), str(HERE.parent / "assurance-connector")]
from core import Host
from receiver import Receiver
from study import base_action, observed


class ControlTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("control"), "phase5 control missing"
        )
        from control import Controller

        self.Controller = Controller
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.receiver = Receiver(self.path / "inbox.sqlite")
        self.addCleanup(self.receiver.close)
        self.action = base_action()
        self.host = Host.create(
            self.path / "host.sqlite",
            self.receiver.client,
            identity={k: self.action[k] for k in ("run", "principal", "tenant")},
            approved=self.action,
            control="enforced",
        )

    def controller(self, policy="recover"):
        return self.Controller(self.host, self.path, policy)

    def test_mismatched_destination_recovers_only_exact_host_approved_action(self):
        c = self.controller()
        action = {**self.action, "resource": "foreign-inbox"}
        result = c.handle({"status": "call", "action": action})
        self.assertEqual(result, {"status": "observed", "recovery": True})
        self.assertEqual(observed(self.receiver.path), [self.action])
        self.assertEqual(sum(e["type"] == "recovery_reserved" for e in c.events()), 1)

    def test_malformed_can_recover_but_decline_and_generation_error_are_terminal(self):
        c = self.controller()
        for status in ("declined", "generation_error"):
            self.assertEqual(
                c.handle({"status": status}), {"status": status, "recovery": False}
            )
        self.assertEqual(observed(self.receiver.path), [])
        self.assertEqual(c.handle({"status": "invalid"})["status"], "observed")

    def test_budget_persists_across_controller_restart(self):
        self.assertEqual(
            self.controller().handle({"status": "invalid"})["status"], "observed"
        )
        self.assertEqual(
            self.controller().handle({"status": "invalid"})["status"],
            "recovery_budget_exhausted",
        )
        self.assertEqual(observed(self.receiver.path), [self.action])

    def test_revocation_between_block_and_fallback_prevents_effect(self):
        dispatch = self.host.dispatch

        def revoke_after_block(action):
            result = dispatch(action)
            if result["status"] == "blocked":
                self.host.revoke()
            return result

        self.host.dispatch = revoke_after_block
        action = {**self.action, "content": "unapproved"}
        c = self.controller()
        self.assertEqual(
            c.handle({"status": "call", "action": action})["status"], "blocked"
        )
        self.assertEqual(observed(self.receiver.path), [])
        self.assertFalse(any(e["type"] == "recovery_reserved" for e in c.events()))

    def test_unknown_reconciles_committed_effect_without_resending(self):
        client = self.receiver.client

        class LostReply:
            sends = 0

            def send(inner, key, action):
                inner.sends += 1
                client.send(key, action)
                raise OSError("synthetic lost reply")

            def lookup(inner, key):
                return client.lookup(key)

        fault = LostReply()
        self.host.client = fault
        c = self.controller()
        self.assertEqual(
            c.handle({"status": "call", "action": self.action}),
            {"status": "observed", "recovery": False},
        )
        self.assertEqual(fault.sends, 1)
        self.assertEqual(observed(self.receiver.path), [self.action])
        self.assertTrue(any(e["type"] == "reconciled" for e in c.events()))

    def test_stop_policy_revokes_and_survives_restart(self):
        c = self.controller("stop")
        action = {**self.action, "resource": "foreign-inbox"}
        self.assertEqual(
            c.handle({"status": "call", "action": action})["status"], "blocked"
        )
        self.assertEqual(
            self.controller("recover").handle(
                {"status": "call", "action": self.action}
            )["status"],
            "blocked",
        )
        self.assertEqual(observed(self.receiver.path), [])
        events = c.events()
        self.assertEqual(sum(e["type"] == "detected" for e in events), 1)
        self.assertEqual(sum(e["type"] == "revoked" for e in events), 1)
        self.assertTrue(
            all(
                e["identity"]
                == {k: self.action[k] for k in ("run", "principal", "tenant")}
                for e in events
            )
        )

    def test_baseline_does_not_recover_and_bypass_host_is_rejected(self):
        self.assertEqual(
            self.controller("baseline").handle({"status": "invalid"})["status"],
            "invalid",
        )
        with sqlite3.connect(self.host.path) as db:
            db.execute("UPDATE policy SET control='bypass'")
        with self.assertRaises(ValueError):
            self.controller()

    def test_malformed_wrapper_cannot_smuggle_recovery_grant(self):
        c = self.controller()
        for proposal in (
            {"status": "invalid", "approved": self.action},
            {"status": "call"},
            {"status": "call", "action": self.action, "policy": "bypass"},
        ):
            with self.assertRaises(ValueError):
                c.handle(proposal)
        self.assertEqual(observed(self.receiver.path), [])


if __name__ == "__main__":
    unittest.main()
