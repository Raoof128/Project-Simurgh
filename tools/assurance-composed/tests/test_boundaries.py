"""Cross-process persistence and cross-component ordering regressions."""

import json
import sqlite3
import subprocess
import sys
import threading
import unittest
from dataclasses import asdict

import test_composition as fixtures


class BoundaryTests(unittest.TestCase):
    def fresh(self):
        f = fixtures.CompositionTests()
        f.setUp()
        self.addCleanup(f.doCleanups)
        return f

    def test_process_exit_inside_update_retains_hold(self):
        f = self.fresh()
        script = """import json,os,sys
sys.path.insert(0,sys.argv[1])
from composition import Pipeline
from transport import SessionClient
v=json.load(sys.stdin)
p=Pipeline(sys.argv[2],actions=v['actions'],client=SessionClient(**v['client']),revoker=lambda _:None,task='task',source='v1',registry=v['registry'],webhook_secret='w'*32,operator_key=b'o'*32,lookup=lambda _:None,clock=lambda:100.0,boot='test-boot')
p.update(lambda:os._exit(73))
"""
        from test_composition import HERE

        result = subprocess.run(
            [sys.executable, "-B", "-c", script, str(HERE), str(f.path / "controls")],
            input=json.dumps(
                {
                    "actions": f.actions,
                    "client": asdict(f.client),
                    "registry": f.args["registry"],
                }
            ),
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 73, result.stderr)
        f.reopen()
        self.assertTrue(f.pipe.held())
        self.assertEqual(
            f.pipe.resume("root").dispatch(f.actions["a"])["status"], "blocked"
        )
        self.assertEqual(f.effects(), 0)

    def test_control_update_waits_for_admitted_call(self):
        f = self.fresh()
        actor = f.pipe.resume("root")
        entered, release, updated = (
            threading.Event(),
            threading.Event(),
            threading.Event(),
        )
        original = f.pipe.gateways["a"].client

        class Paused:
            def send(self, action):
                entered.set()
                if not release.wait(5):
                    raise TimeoutError("test barrier")
                return original.send(action)

        f.pipe.gateways["a"].client = Paused()
        results = {}
        sender = threading.Thread(
            target=lambda: results.update(send=actor.dispatch(f.actions["a"]))
        )
        # Reopen proves the lock is shared beyond one Pipeline instance.
        other = f.c.Pipeline(f.path / "controls", **f.args)

        def stop():
            other.update(other.stop)
            updated.set()

        stopper = threading.Thread(target=stop)
        sender.start()
        try:
            self.assertTrue(entered.wait(3))
            stopper.start()
            self.assertFalse(updated.wait(0.2))
        finally:
            release.set()
            sender.join(5)
            if stopper.ident is not None:
                stopper.join(5)
        self.assertFalse(sender.is_alive())
        self.assertFalse(stopper.is_alive())
        self.assertTrue(updated.is_set())
        self.assertEqual(results["send"]["status"], "observed")
        self.assertEqual(original.send(f.actions["b"])["status"], "denied")
        self.assertEqual(f.effects(), 1)

    def test_port_policy_rebinding_is_rejected(self):
        f = self.fresh()
        with sqlite3.connect(f.path / "controls/a-port.sqlite") as db:
            db.execute("UPDATE policy SET approved='{}'")
        with self.assertRaisesRegex(ValueError, "port_binding"):
            f.reopen()

    def test_new_boot_requires_monitor_and_operator_restart(self):
        f = self.fresh()
        f.args["boot"] = "next-boot"
        f.reopen()
        self.assertEqual(
            f.pipe.resume("root").dispatch(f.actions["a"])["status"], "blocked"
        )
        self.assertEqual(f.effects(), 0)


if __name__ == "__main__":
    unittest.main()
