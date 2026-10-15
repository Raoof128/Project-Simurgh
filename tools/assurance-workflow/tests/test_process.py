# SPDX-License-Identifier: AGPL-3.0-or-later
import tempfile
import unittest
from pathlib import Path

from simurgh_redis.connector import Connector
from simurgh_redis.service import RedisService
from simurgh_workflow.process import pause_and_kill, resume_many
from simurgh_workflow.workflow import Workflow, initialize
from test_workflow import ACTION


class ProcessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sw-process-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.service = RedisService(self.root / "redis").start()
        self.addCleanup(self.service.close)

    def test_native_pause_survives_actual_sigkill_and_fresh_process(self):
        for framework in ("openai-agents", "langgraph"):
            root = self.root / framework
            initialize(root, framework, ACTION)
            pause = pause_and_kill(root, self.service.socket)
            self.assertEqual(pause["exit"], -9)
            self.assertEqual(pause["result"]["callbacks"], 0)
            resumed = resume_many(root, self.service.socket, "approve")[0]
            self.assertNotEqual(pause["pid"], resumed["pid"])
            self.assertEqual(resumed["result"]["status"], "completed")
            self.assertEqual(
                len(
                    Connector(root / "effect", self.service.socket).observe()["effects"]
                ),
                1,
            )

    def test_after_effect_crash_reuses_saved_decision_and_recovers(self):
        for framework in ("openai-agents", "langgraph"):
            root = self.root / framework
            initialize(root, framework, ACTION)
            pause_and_kill(root, self.service.socket)
            crashed = resume_many(
                root, self.service.socket, "approve", crash_after_effect=True
            )[0]
            self.assertEqual(crashed["exit"], -9)
            flow = Workflow(root, self.service.socket)
            self.assertEqual(
                flow.stats(), {"phase": "paused", "decision": "approve", "callbacks": 1}
            )
            recovered = resume_many(root, self.service.socket, "approve")[0]
            self.assertEqual(recovered["result"]["status"], "completed")
            self.assertFalse(recovered["result"]["toolResult"]["effectCreated"])
            self.assertEqual(flow.stats()["callbacks"], 2)
            self.assertEqual(
                len(
                    Connector(root / "effect", self.service.socket).observe()["effects"]
                ),
                1,
            )

    def test_killed_native_scratch_belongs_to_parent_cleanup(self):
        root = self.root / "cleanup"
        initialize(root, "langgraph", ACTION)
        pause_and_kill(root, self.service.socket)
        crashed = resume_many(
            root, self.service.socket, "approve", crash_after_effect=True
        )[0]
        self.assertEqual(crashed["exit"], -9)
        remnants = list(root.glob("sw-native-*"))
        self.assertTrue(
            remnants, "killed native scratch escaped the parent-owned workflow root"
        )
        self.assertTrue(all((path / "native.sqlite3").exists() for path in remnants))
        recovered = resume_many(root, self.service.socket, "approve")[0]
        self.assertEqual(recovered["result"]["status"], "completed")
        self.service.close()
        self.temp.cleanup()
        self.assertTrue(all(not path.exists() for path in remnants))

    def test_four_concurrent_resumers_dispatch_once(self):
        root = self.root / "langgraph"
        initialize(root, "langgraph", ACTION)
        pause_and_kill(root, self.service.socket)
        rows = resume_many(root, self.service.socket, "approve", count=4)
        self.assertEqual(len({row["pid"] for row in rows}), 4)
        self.assertTrue(all(row["result"]["status"] == "completed" for row in rows))
        self.assertEqual(sum(not row["result"]["cached"] for row in rows), 1)
        self.assertEqual(Workflow(root, self.service.socket).stats()["callbacks"], 1)


if __name__ == "__main__":
    unittest.main()
