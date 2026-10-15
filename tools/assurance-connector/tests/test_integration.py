import importlib.util
import json
import os
import signal
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_connector import SOURCE, action


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(
            importlib.util.find_spec("workflow"), "composed workflow missing"
        )
        from core import Host
        from receiver import Receiver

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
            return [json.loads(r[0]) for r in db.execute("SELECT payload FROM inbox")]

    def test_native_approval_then_isolation_then_effect(self):
        from workflow import native_delivery

        result = native_delivery(self.host, action(), self.root)
        self.assertEqual(result["status"], "observed")
        self.assertTrue(result["native_interrupted"])
        self.assertEqual(result["worker"], {"path_denied": True, "socket_denied": True})
        self.assertFalse((self.root / "forbidden").exists())
        self.assertEqual(self.effects(), [action()])

    def test_native_rejection_prevents_tool_and_effect(self):
        from workflow import native_delivery

        result = native_delivery(self.host, action(), self.root, decision="reject")
        self.assertEqual(result["status"], "refused")
        self.assertIsNone(result["worker"])
        self.assertEqual(self.effects(), [])

    def test_invalid_worker_output_and_environment_scrub(self):
        from workflow import isolate

        os.environ["SIMURGH_PHASE2_SYNTHETIC_SECRET"] = "synthetic-only"
        self.addCleanup(os.environ.pop, "SIMURGH_PHASE2_SYNTHETIC_SECRET")
        result = isolate(action(), self.root)
        self.assertEqual(result["proposal"], action())
        self.assertNotIn("SIMURGH_PHASE2_SYNTHETIC_SECRET", result["environment_names"])
        with self.assertRaises(ValueError):
            isolate('{"id":1,"id":2}', self.root, raw=True)
        self.assertEqual(self.effects(), [])

    def test_real_sigkill_before_and_after_remote_commit(self):
        from core import Host

        # Fixture injection is in this test child only, not a production fault mode.
        for stage, count, recovered in (
            ("before", 0, "not_observed"),
            ("after", 1, "observed"),
        ):
            with self.subTest(stage=stage):
                if stage == "after":
                    # Explicit authorized retry of the earlier absent observation.
                    pass
                code = """
import os,signal,sys,json
sys.path.insert(0,sys.argv[1])
from core import Host
from receiver import Client
class Killed(Client):
    def send(self,key,action):
        if sys.argv[5] == "after":
            super().send(key,action)
        os.kill(os.getpid(),signal.SIGKILL)
host=Host(sys.argv[2],Killed(sys.argv[3],sys.stdin.readline().strip()))
host.dispatch(json.loads(sys.argv[4]),retry=True)
"""
                proc = subprocess.run(
                    [
                        sys.executable,
                        "-I",
                        "-B",
                        "-c",
                        code,
                        str(SOURCE),
                        str(self.host.path),
                        self.receiver.client.url,
                        json.dumps(action()),
                        stage,
                    ],
                    input=self.receiver.client.token + "\n",
                    text=True,
                    check=False,
                    capture_output=True,
                    timeout=10,
                )
                self.assertEqual(proc.returncode, -signal.SIGKILL, proc.stderr)
                restored = Host(self.host.path, self.receiver.client)
                self.assertEqual(restored.dispatch(action())["status"], "unknown")
                self.assertEqual(restored.reconcile(action())["status"], recovered)
                self.assertEqual(len(self.effects()), count)
        self.host.revoke()
        self.assertEqual(self.host.dispatch(action(), retry=True)["status"], "blocked")
        self.assertEqual(len(self.effects()), 1)


if __name__ == "__main__":
    unittest.main()
