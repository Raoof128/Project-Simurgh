# SPDX-License-Identifier: AGPL-3.0-or-later
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from simurgh_redis.connector import Connector
from simurgh_redis.service import RedisService
from simurgh_redis.transport import request
from simurgh_workflow.workflow import Workflow, initialize

ACTION = {
    "id": "a1",
    "run": "r1",
    "principal": "alice",
    "tenant": "team",
    "operation": "write",
    "resource": "patch",
    "content": "approved",
    "policyRevision": "v1",
}


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sw-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.service = RedisService(self.root / "redis").start()
        self.addCleanup(self.service.close)

    def workflow(self, framework):
        root = self.root / framework
        initialize(root, framework, ACTION)
        return Workflow(root, self.service.socket)

    def test_both_native_checkpoints_restore_and_replay(self):
        for framework in ("openai-agents", "langgraph"):
            with self.subTest(framework=framework):
                flow = self.workflow(framework)
                pause = flow.pause()
                self.assertEqual(
                    pause, {"status": "paused", "interruptions": 1, "callbacks": 0}
                )
                self.assertEqual(flow.stats()["callbacks"], 0)
                restored = Workflow(flow.root, self.service.socket)
                result = restored.resume("approve")
                self.assertEqual(result["status"], "completed")
                self.assertEqual(result["nativeResumptions"], 1)
                self.assertTrue(result["toolResult"]["effectCreated"])
                again = Workflow(flow.root, self.service.socket).resume("approve")
                self.assertTrue(again["cached"])
                self.assertIsNone(again["toolResult"])
                self.assertEqual(flow.stats()["callbacks"], 1)
                self.assertEqual(
                    len(
                        Connector(flow.root / "effect", self.service.socket).observe()[
                            "effects"
                        ]
                    ),
                    1,
                )

    def test_rejection_never_dispatches(self):
        for framework in ("openai-agents", "langgraph"):
            flow = self.workflow(framework)
            flow.pause()
            self.assertEqual(flow.resume("reject")["status"], "rejected")
            self.assertEqual(flow.stats()["callbacks"], 0)
            with self.assertRaisesRegex(ValueError, "decision_conflict"):
                flow.resume("approve")
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_revocation_and_revision_are_checked_after_pause(self):
        for framework, change in (
            ("openai-agents", {"revoked": True}),
            ("langgraph", {"revision": "v2"}),
        ):
            flow = self.workflow(framework)
            flow.pause()
            flow.change_policy(**change)
            result = flow.resume("approve")
            self.assertEqual(result["status"], "denied")
            self.assertEqual(result["toolResult"]["status"], "denied")
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_checkpoint_integrity_checked_before_deserialization(self):
        for framework in ("openai-agents", "langgraph"):
            flow = self.workflow(framework)
            flow.pause()
            path = flow.root / "checkpoint.bin"
            path.write_bytes(path.read_bytes() + b"changed")
            with (
                patch(
                    "simurgh_workflow.workflow.native_resume",
                    side_effect=AssertionError("must_not_deserialize"),
                ),
                self.assertRaisesRegex(ValueError, "checkpoint_integrity"),
            ):
                flow.resume("approve")
            self.assertEqual(flow.stats()["callbacks"], 0)
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_missing_checkpoint_and_version_mismatch_refuse(self):
        flow = self.workflow("openai-agents")
        flow.pause()
        (flow.root / "checkpoint.bin").unlink()
        with self.assertRaises(OSError):
            flow.resume("approve")
        flow = self.workflow("langgraph")
        flow.pause()
        with sqlite3.connect(flow.root / "workflow.sqlite3") as connection:
            connection.execute("UPDATE workflow SET version='wrong'")
        with self.assertRaisesRegex(ValueError, "version_mismatch"):
            flow.resume("approve")
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_completed_effect_loss_stays_unknown(self):
        flow = self.workflow("openai-agents")
        flow.pause()
        flow.resume("approve")
        connector = Connector(flow.root / "effect", self.service.socket)
        request(self.service.socket, ["DEL", connector.key(ACTION)])
        result = flow.resume("approve")
        self.assertEqual(result["status"], "unknown")
        self.assertEqual(flow.stats()["callbacks"], 1)
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_transport_unknown_preserves_pending_workflow_and_decision(self):
        flow = self.workflow("langgraph")
        flow.pause()
        self.service.kill()
        first = flow.resume("approve")
        self.assertEqual(first["status"], "unknown")
        self.assertEqual(
            flow.stats(), {"phase": "paused", "decision": "approve", "callbacks": 1}
        )
        self.service.start()
        second = flow.resume("approve")
        self.assertEqual(second["status"], "unknown")
        self.assertEqual(second["toolResult"]["reason"], "pending_effect_absent")
        self.assertEqual(
            flow.stats(), {"phase": "paused", "decision": "approve", "callbacks": 2}
        )
        self.assertEqual(request(self.service.socket, ["DBSIZE"]), 0)

    def test_invalid_inputs_do_not_create_state(self):
        with self.assertRaises(ValueError):
            initialize(self.root / "invalid", "unsupported", ACTION)
        self.assertFalse((self.root / "invalid").exists())
        flow = self.workflow("openai-agents")
        with self.assertRaisesRegex(ValueError, "invalid_decision"):
            flow.resume("always")
        with self.assertRaisesRegex(ValueError, "not_paused"):
            flow.resume("approve")


if __name__ == "__main__":
    unittest.main()
