"""Retained boundary probes from the fresh whole-change review."""

import threading
import unittest
from concurrent.futures import ThreadPoolExecutor

import test_context as fixtures


class ReviewTests(unittest.TestCase):
    def fresh(self):
        fixture = fixtures.ContextTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        return fixture

    def test_forged_identity_and_duplicate_grant_do_not_expand_authority(self):
        t = self.fresh()
        root = t.resume()
        self.assertTrue(root.delegate("child-a", ["a"]))
        child = t.resume("child-a")
        for action in (
            dict(t.actions["b"], actor="root"),
            dict(t.actions["b"], principal="root"),
        ):
            self.assertEqual(child.dispatch(action)["status"], "blocked")
        self.assertFalse(root.delegate("child-a", ["a", "b"]))
        self.assertEqual(t.client.sent, [])

    def test_registry_cycle_rejected_before_state_creation(self):
        t = self.fresh()
        path = t.path / "cycle.sqlite"
        with self.assertRaisesRegex(ValueError, "registry_cycle_or_parent"):
            t.Gate.create(
                path,
                t.hosts,
                t.actions,
                task="task",
                source="source-v1",
                registry={
                    "one": {"parent": "two", "task": "task"},
                    "two": {"parent": "one", "task": "task"},
                },
            )
        self.assertFalse(path.exists())

    def test_depth_three_delegation_blocked(self):
        t = self.fresh()
        registry = {
            "one": {"parent": "root", "task": "task"},
            "two": {"parent": "one", "task": "task"},
            "three": {"parent": "two", "task": "task"},
        }
        t.gate = t.Gate.create(
            t.path / "depth.sqlite",
            t.hosts,
            t.actions,
            task="task",
            source="source-v1",
            registry=registry,
        )
        self.assertTrue(t.resume().delegate("one", ["a"]))
        self.assertTrue(t.resume("one").delegate("two", ["a"]))
        self.assertFalse(t.resume("two").delegate("three", ["a"]))

    def test_revoke_during_admitted_rpc_preserves_limit(self):
        t = self.fresh()
        session = t.resume()
        entered = threading.Event()
        release = threading.Event()
        original = t.client.send

        def paused(key, action):
            entered.set()
            if not release.wait(5):
                raise RuntimeError("barrier timeout")
            return original(key, action)

        t.client.send = paused
        with ThreadPoolExecutor(1) as pool:
            pending = pool.submit(session.dispatch, t.actions["a"])
            try:
                self.assertTrue(entered.wait(5))
                t.gate.revoke("root")
                self.assertEqual(session.dispatch(t.actions["b"])["status"], "blocked")
            finally:
                release.set()
            self.assertEqual(pending.result(timeout=5)["status"], "observed")
        self.assertEqual(t.client.sent, ["a"])
        self.assertEqual(t.gate.projection()["budget"]["reserved"], 1)

    def test_unexpected_exception_keeps_unknown_and_budget(self):
        t = self.fresh()

        def unexpected(*args):
            raise RuntimeError("owned fault")

        t.client.send = unexpected
        with self.assertRaisesRegex(RuntimeError, "owned fault"):
            t.resume().dispatch(t.actions["a"])
        t.gate = t.Gate(t.path / "context.sqlite", t.hosts)
        self.assertEqual(t.resume().dispatch(t.actions["a"])["status"], "unknown")
        self.assertEqual(t.resume().dispatch(t.actions["b"])["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
