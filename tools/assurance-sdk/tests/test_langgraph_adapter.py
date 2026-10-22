# SPDX-License-Identifier: AGPL-3.0-or-later
"""Run the actual LangGraph runtime, with only the external sink callback substituted."""

import copy
import os
import socket
import unittest
from unittest.mock import patch

from simurgh_sdk.langgraph_adapter import run_actions

ACTION = {
    "id": "action-1",
    "run": "fixture-run",
    "principal": "fixture-user",
    "tenant": "fixture-tenant",
    "operation": "write",
    "resource": "patch",
    "content": "synthetic patch",
    "policyRevision": "v1",
}


class LangGraphAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.enterContext(
            patch.dict(
                os.environ,
                {"LANGSMITH_TRACING": "false", "LANGCHAIN_TRACING_V2": "false"},
            )
        )
        self.enterContext(
            patch.object(
                socket.socket,
                "connect",
                side_effect=AssertionError("network forbidden"),
            )
        )
        self.enterContext(
            patch.object(
                socket.socket,
                "connect_ex",
                side_effect=AssertionError("network forbidden"),
            )
        )
        self.enterContext(
            patch.object(
                socket,
                "create_connection",
                side_effect=AssertionError("network forbidden"),
            )
        )
        self.effects = []
        self.calls = []
        self.observations = []

    async def execute(self, action):
        self.calls.append(copy.deepcopy(action))
        self.effects.append(copy.deepcopy(action))
        return {"status": "executed", "action": copy.deepcopy(action)}

    async def observe(self):
        result = {"available": True, "effects": copy.deepcopy(self.effects)}
        self.observations.append(copy.deepcopy(result))
        return result

    async def test_native_interrupt_pauses_before_effect_and_resumes_approved_action(
        self,
    ):
        result = await run_actions([ACTION], self.execute, self.observe)
        self.assertEqual(self.observations, [{"available": True, "effects": []}])
        self.assertEqual(self.effects, [ACTION])
        self.assertEqual(
            result,
            {
                "framework": "langgraph",
                "interruptions": 1,
                "resumptions": 1,
                "state_roundtrips": 0,
                "decisions": ["approve"],
                "tool_results": [{"status": "executed", "action": ACTION}],
                "pause_observations": [{"available": True, "effects": []}],
            },
        )

    async def test_rejection_terminates_without_executing_callback(self):
        result = await run_actions(
            [ACTION], self.execute, self.observe, decisions=[{"type": "reject"}]
        )
        self.assertEqual(self.effects, [])
        self.assertEqual(self.calls, [])
        self.assertEqual(result["tool_results"], [])
        self.assertEqual(result["decisions"], ["reject"])
        self.assertEqual(result["interruptions"], 1)
        self.assertEqual(result["resumptions"], 1)

    async def test_native_edit_dispatches_replacement_to_original_boundary_callback(
        self,
    ):
        original = copy.deepcopy(ACTION)
        edited = {**ACTION, "content": "unauthorized replacement"}

        async def exact_boundary(action):
            self.calls.append(copy.deepcopy(action))
            if action != original:
                return {"status": "blocked"}
            self.effects.append(copy.deepcopy(action))
            return {"status": "executed"}

        result = await run_actions(
            [original],
            exact_boundary,
            self.observe,
            decisions=[{"type": "edit", "action": edited}],
        )
        self.assertEqual(self.calls, [edited])
        self.assertEqual(self.effects, [])
        self.assertEqual(original, ACTION)
        self.assertEqual(result["tool_results"], [{"status": "blocked"}])
        self.assertEqual(result["decisions"], ["edit"])

    async def test_duplicate_ids_reach_same_callback_and_persistent_policy(self):
        consumed = set()

        async def single_use_boundary(action):
            self.calls.append(copy.deepcopy(action))
            if action["id"] in consumed:
                return {"status": "blocked"}
            consumed.add(action["id"])
            self.effects.append(copy.deepcopy(action))
            return {"status": "executed"}

        result = await run_actions([ACTION, ACTION], single_use_boundary, self.observe)
        self.assertEqual(self.calls, [ACTION, ACTION])
        self.assertEqual(self.effects, [ACTION])
        self.assertEqual(
            result["tool_results"], [{"status": "executed"}, {"status": "blocked"}]
        )
        self.assertEqual(
            result["pause_observations"],
            [
                {"available": True, "effects": []},
                {"available": True, "effects": [ACTION]},
            ],
        )
        self.assertEqual(result["interruptions"], 2)
        self.assertEqual(result["resumptions"], 2)

    async def test_decisions_and_actions_snapshotted_before_pause_callback(self):
        actions = [copy.deepcopy(ACTION), {**ACTION, "id": "action-2"}]
        original_actions = copy.deepcopy(actions)
        decisions = [{"type": "approve"}, {"type": "approve"}]

        async def mutate_caller_data():
            actions[0]["content"] = "mutated while paused"
            actions[1]["content"] = "mutated future action"
            decisions[0].update(type="edit", action={**ACTION, "content": "injected"})
            decisions[1]["type"] = "reject"
            return await self.observe()

        result = await run_actions(
            actions, self.execute, mutate_caller_data, decisions=decisions
        )
        self.assertEqual(self.calls, original_actions)
        self.assertEqual(result["decisions"], ["approve", "approve"])

    async def test_malformed_decisions_fail_before_any_effect(self):
        invalid = [
            [],
            [{}],
            [{"type": "unknown"}],
            [{"type": True}],
            [{"type": "approve", "action": ACTION}],
            [{"type": "reject", "extra": True}],
            [{"type": "edit"}],
            [{"type": "edit", "action": None}],
            [{"type": "edit", "action": ACTION, "extra": True}],
            [{"type": "approve"}, {"type": "approve"}],
            [None],
            {"type": "approve"},
        ]
        for decisions in invalid:
            with self.subTest(decisions=decisions), self.assertRaises(ValueError):
                await run_actions(
                    [ACTION], self.execute, self.observe, decisions=decisions
                )
        self.assertEqual(self.calls, [])
        self.assertEqual(self.effects, [])
        self.assertEqual(self.observations, [])

    async def test_bad_later_decision_does_not_partially_execute_workflow(self):
        with self.assertRaises(ValueError):
            await run_actions(
                [ACTION, ACTION],
                self.execute,
                self.observe,
                decisions=[{"type": "approve"}, {"type": "edit"}],
            )
        self.assertEqual(self.effects, [])

    async def test_unavailable_observation_is_preserved_not_relabelled_safe(self):
        async def unavailable():
            return {"available": False, "reason": "observer unavailable"}

        result = await run_actions(
            [ACTION], self.execute, unavailable, decisions=[{"type": "reject"}]
        )
        self.assertEqual(
            result["pause_observations"],
            [{"available": False, "reason": "observer unavailable"}],
        )
        self.assertEqual(self.effects, [])

    async def test_execution_error_propagates_without_false_completion(self):
        async def broken(_action):
            raise RuntimeError("sink unavailable")

        with self.assertRaisesRegex(RuntimeError, "sink unavailable"):
            await run_actions([ACTION], broken, self.observe)
        self.assertEqual(self.effects, [])
        self.assertEqual(self.observations, [{"available": True, "effects": []}])

    async def test_tracing_remains_disabled_when_caller_enables_environment_flags(self):
        from langsmith.run_helpers import get_tracing_context

        async def check_context(action):
            self.assertIs(get_tracing_context()["enabled"], False)
            return await self.execute(action)

        with patch.dict(
            os.environ, {"LANGSMITH_TRACING": "true", "LANGCHAIN_TRACING_V2": "true"}
        ):
            result = await run_actions([ACTION], check_context, self.observe)
        self.assertEqual(result["resumptions"], 1)
        self.assertEqual(self.effects, [ACTION])

    async def test_observation_error_stops_before_resume_or_effect(self):
        async def broken():
            raise RuntimeError("observer unavailable")

        with self.assertRaisesRegex(RuntimeError, "observer unavailable"):
            await run_actions([ACTION], self.execute, broken)
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
