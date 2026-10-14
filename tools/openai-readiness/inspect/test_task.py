# SPDX-License-Identifier: AGPL-3.0-or-later
"""Optional tests; run with the pinned Inspect environment."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "simurgh_inspect_task", Path(__file__).with_name("task.py")
)
bridge = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)


class InspectBridgeTests(unittest.TestCase):
    def test_completion_is_strict_json_without_duplicate_keys(self):
        proposal = {"name": "lookup_record", "arguments": {"resource": "public"}}
        self.assertEqual(bridge.parse_proposal(json.dumps(proposal)), proposal)
        for text in [
            "I refuse",
            "",
            "[]",
            "null",
            "```json\n{}\n```",
            '{"name":"lookup_record","name":"send_report","arguments":{}}',
            '{"name":"lookup_record","arguments":{"resource":NaN}}',
            '{"name":"lookup_record","arguments":{"resource":1e400}}',
        ]:
            with self.subTest(text=text), self.assertRaises(ValueError):
                bridge.parse_proposal(text)

    def test_dataset_contains_no_external_authority_or_offline_answer(self):
        task = bridge.simurgh_boundary()
        self.assertEqual(len(task.dataset), 15)
        for sample in task.dataset:
            self.assertEqual(set(sample.metadata), {"scenario_id", "kind"})
            self.assertEqual(
                set(json.loads(sample.input)),
                {"scenario_id", "task", "untrusted_context", "tool_schemas"},
            )
            self.assertEqual(sample.target, "")

    def test_inspect_mock_runs_real_boundary_without_network(self):
        with (
            tempfile.TemporaryDirectory(prefix="simurgh-inspect-test-") as log_dir,
            patch(
                "socket.socket.connect",
                side_effect=AssertionError("Network forbidden in smoke"),
            ),
        ):
            result = bridge.run_smoke(log_dir)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["samples"], 7)
        self.assertEqual(result["scored_one"], 6)
        self.assertEqual(result["benign_completions"], 3)
        self.assertEqual(result["contained_valid_attacks"], 3)
        self.assertEqual(result["execution_errors"], 1)
        self.assertEqual(result["forbidden_effects"], 0)

    def test_live_generation_requires_explicit_task_authorization(self):
        import asyncio

        from inspect_ai.solver import TaskState

        state = TaskState(
            model="openai/unapproved",
            sample_id="public-read",
            epoch=1,
            input="test",
            messages=[],
        )
        with self.assertRaises(PermissionError):
            asyncio.run(bridge.require_model_authorization()(state, None))
        self.assertIs(
            asyncio.run(
                bridge.require_model_authorization(allow_live=True)(state, None)
            ),
            state,
        )

    def test_invalid_model_response_has_zero_score(self):
        import asyncio

        from inspect_ai.model import ModelOutput
        from inspect_ai.scorer import Target
        from inspect_ai.solver import TaskState

        state = TaskState(
            model="mockllm/model",
            sample_id="resource-escalation",
            epoch=1,
            input="test",
            messages=[],
            metadata={"scenario_id": "resource-escalation", "kind": "attack"},
        )
        state.output = ModelOutput.from_content(model="mockllm", content="I refuse")
        result = asyncio.run(bridge.boundary_score()(state, Target("")))
        self.assertEqual(result.value, 0)
        self.assertEqual(result.metadata["result"]["status"], "proposal_error")


if __name__ == "__main__":
    unittest.main()
