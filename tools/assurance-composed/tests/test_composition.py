import importlib.util
import sqlite3
import sys
import tempfile
import threading
import unittest
from dataclasses import replace
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))


class CompositionTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("composition"), "composition must exist"
        )
        import composition as c

        self.c = c
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        from transport import Service

        self.service = Service(
            self.path / "service.sqlite",
            "continuous",
            admin_key="a" * 64,
            issuer="test-issuer",
        )
        self.addCleanup(self.service.close)
        cred = self.service.issue(
            "c1", "alice", "tenant", "inbox", 200, secret="c" * 64
        )
        self.client = self.service.login(cred)
        self.actions = {
            k: {
                "id": k,
                "run": "test",
                "principal": "alice",
                "tenant": "tenant",
                "operation": "send_report",
                "resource": "inbox",
                "content": "report " + k,
                "policyRevision": "v1",
            }
            for k in ("a", "b")
        }
        self.now = 100.0
        self.args = {
            "actions": self.actions,
            "client": self.client,
            "revoker": self.service.revoke,
            "task": "task",
            "source": "v1",
            "registry": {
                "child": {"parent": "root", "task": "task"},
                "grandchild": {"parent": "child", "task": "task"},
            },
            "webhook_secret": "w" * 32,
            "operator_key": b"o" * 32,
            "lookup": lambda _: None,
            "clock": lambda: self.now,
            "boot": "test-boot",
        }
        self.pipe = c.Pipeline.create(self.path / "controls", **self.args)
        self.pipe.update(lambda: self.activate())

    def activate(self):
        for key, signal in self.pipe.signals.items():
            signal.heartbeat()
            self.assertTrue(
                signal.restart(
                    self.c.restart_token(signal, b"o" * 32, self.now, "start-" + key)
                )
            )

    def reopen(self):
        self.pipe = self.c.Pipeline(self.path / "controls", **self.args)
        return self.pipe

    def effects(self):
        with sqlite3.connect(self.service.path) as db:
            return db.execute("SELECT count(*) FROM effects").fetchone()[0]

    def test_child_authority_and_shared_budget(self):
        root = self.pipe.resume("root")
        self.assertTrue(
            self.pipe.update(lambda: root.context.delegate("child", ["a", "b"]))
        )
        child = self.pipe.resume("child")
        self.assertEqual(child.dispatch(self.actions["a"])["status"], "observed")
        self.assertEqual(child.dispatch(self.actions["b"])["status"], "blocked")
        self.assertEqual(self.effects(), 1)

    def test_receiver_denial_is_retained_and_conservatively_translated(self):
        self.service.revoke("c1")
        self.assertEqual(
            self.pipe.resume("root").dispatch(self.actions["a"])["status"], "blocked"
        )
        with sqlite3.connect(self.pipe.gateways["a"].path) as db:
            self.assertEqual(
                db.execute("SELECT status FROM intents").fetchone()[0], "denied"
            )
        self.assertEqual(self.effects(), 0)

    def test_interrupted_update_stays_held_after_reopen(self):
        def broken():
            self.pipe.context.revoke("root")
            raise RuntimeError("partial operation")

        with self.assertRaises(RuntimeError):
            self.pipe.update(broken)
        self.reopen()
        self.assertTrue(self.pipe.held())
        self.assertEqual(
            self.pipe.resume("root").dispatch(self.actions["a"])["status"], "blocked"
        )
        with self.assertRaisesRegex(ValueError, "held"):
            self.pipe.update(lambda: None)

    def test_unknown_is_not_resent_or_refunded_after_reopen(self):
        self.service.drop_next()
        self.assertEqual(
            self.pipe.resume("root").dispatch(self.actions["a"])["status"], "unknown"
        )
        self.reopen()
        actor = self.pipe.resume("root")
        self.assertEqual(actor.dispatch(self.actions["a"])["status"], "unknown")
        self.assertEqual(actor.dispatch(self.actions["b"])["status"], "blocked")
        self.assertEqual(self.effects(), 1)

    def test_signal_stop_revokes_and_unknown_remote_is_not_acknowledged(self):
        self.service.close()
        self.pipe.update(lambda: self.pipe.stop())
        for s in self.pipe.signals.values():
            self.assertTrue(s.state()["terminal"])
            self.assertIn("revocation_unknown", [e["type"] for e in s.events()])
            self.assertNotIn("host_revoked", [e["type"] for e in s.events()])
        self.assertEqual(
            self.pipe.resume("root").dispatch(self.actions["a"])["status"], "blocked"
        )

    def test_binding_cannot_reopen_with_other_issuer(self):
        self.args["client"] = replace(self.client, issuer="other")
        with self.assertRaises(ValueError):
            self.reopen()

    def test_parallel_distinct_actions_share_one_reservation(self):
        actor = self.pipe.resume("root")
        results = []
        threads = [
            threading.Thread(
                target=lambda k=k: results.append(
                    actor.dispatch(self.actions[k])["status"]
                )
            )
            for k in ("a", "b")
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join(5)
        self.assertEqual(sorted(results), ["blocked", "observed"])
        self.assertEqual(self.effects(), 1)

    def test_expired_monitor_and_reopen_do_not_restart_automatically(self):
        self.now = 131
        self.reopen()
        self.assertEqual(
            self.pipe.resume("root").dispatch(self.actions["a"])["status"], "blocked"
        )
        self.assertEqual(self.effects(), 0)


if __name__ == "__main__":
    unittest.main()
