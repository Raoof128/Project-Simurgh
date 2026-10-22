# SPDX-License-Identifier: AGPL-3.0-or-later
"""Native Agents SDK approval lifecycle against controlled async callbacks."""

import copy
import unittest
from unittest.mock import patch

from simurgh_sdk.openai_adapter import run_actions


def action(**changes):
    return {
        "id": "a1",
        "run": "sdk-test",
        "principal": "reviewer",
        "tenant": "tenant-a",
        "operation": "write",
        "resource": "patch",
        "content": "synthetic",
        "policyRevision": "r1",
        **changes,
    }


class OpenAIAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_native_approve_roundtrip_then_callback_without_network(self):
        effects, ordering = [], []

        async def execute(proposed):
            ordering.append("execute")
            effects.append(copy.deepcopy(proposed))
            return {
                "status": "executed",
                "event": {"sequence": len(effects), "action": proposed},
            }

        async def observe():
            ordering.append("observe")
            return {"available": True, "effects": copy.deepcopy(effects)}

        with patch(
            "socket.socket.connect", side_effect=AssertionError("network forbidden")
        ):
            result = await run_actions([action()], execute, observe)
        self.assertEqual(result["framework"], "openai-agents")
        self.assertEqual(result["interruptions"], 1)
        self.assertEqual(result["resumptions"], 1)
        self.assertEqual(result["state_roundtrips"], 1)
        self.assertEqual(result["decisions"], ["approve"])
        self.assertEqual(
            result["pause_observations"], [{"available": True, "effects": []}]
        )
        self.assertEqual(result["tool_results"][0]["status"], "executed")
        self.assertEqual(effects, [action()])
        self.assertEqual(ordering, ["observe", "execute"])

    async def test_native_reject_does_not_invoke_tool(self):
        async def execute(_action):
            self.fail("SDK rejection must prevent callback")

        async def observe():
            return {"available": True, "effects": []}

        result = await run_actions(
            [action()], execute, observe, decisions=[{"type": "reject"}]
        )
        self.assertEqual(result["decisions"], ["reject"])
        self.assertEqual(result["tool_results"], [])
        self.assertEqual(
            (
                result["interruptions"],
                result["resumptions"],
                result["state_roundtrips"],
            ),
            (1, 1, 1),
        )

    async def test_duplicate_actions_reach_policy_twice_with_distinct_sdk_call_ids(
        self,
    ):
        received = []

        async def execute(proposed):
            received.append(copy.deepcopy(proposed))
            return {
                "status": "executed" if len(received) == 1 else "denied",
                "reason": "fixture_replay_check",
            }

        async def observe():
            return {"available": True, "effects": copy.deepcopy(received[:1])}

        result = await run_actions([action(), action()], execute, observe)
        self.assertEqual(received, [action(), action()])
        self.assertEqual(
            [r["status"] for r in result["tool_results"]], ["executed", "denied"]
        )
        self.assertEqual(
            (
                result["interruptions"],
                result["resumptions"],
                result["state_roundtrips"],
            ),
            (2, 2, 2),
        )
        self.assertEqual(len(result["pause_observations"][0]["effects"]), 0)
        self.assertEqual(len(result["pause_observations"][1]["effects"]), 1)

    async def test_native_call_ids_differ_even_when_external_action_id_repeats(self):
        from simurgh_sdk.openai_adapter import _ScriptedActionModel

        native_ids = []
        original = _ScriptedActionModel.get_response

        async def record(model, *args, **kwargs):
            result = await original(model, *args, **kwargs)
            native_ids.extend(
                item.call_id for item in result.output if item.type == "function_call"
            )
            return result

        async def execute(_action):
            return {"status": "denied", "reason": "test_policy"}

        async def observe():
            return {"available": True, "effects": []}

        with patch.object(_ScriptedActionModel, "get_response", record):
            await run_actions([action(), action()], execute, observe)
        self.assertEqual(len(native_ids), 2)
        self.assertTrue(all(native_ids))
        self.assertEqual(len(set(native_ids)), 2)

    async def test_malformed_observation_stops_before_callback(self):
        async def execute(_action):
            self.fail(
                "Malformed observation must not be interpreted as an empty effect set"
            )

        for observation in [
            None,
            {"available": True},
            {"available": "false", "effects": []},
            {"available": False},
        ]:

            async def observe(value=observation):
                return value

            with (
                self.subTest(observation=observation),
                self.assertRaisesRegex(RuntimeError, "invalid_observation"),
            ):
                await run_actions([action()], execute, observe)

    async def test_unknown_observer_and_execution_error_remain_explicit(self):
        async def execute(_action):
            return {"status": "error", "reason": "sink_unavailable"}

        async def observe():
            return {"available": False, "reason": "observer_unavailable"}

        result = await run_actions([action()], execute, observe)
        self.assertEqual(
            result["pause_observations"],
            [{"available": False, "reason": "observer_unavailable"}],
        )
        self.assertEqual(
            result["tool_results"], [{"status": "error", "reason": "sink_unavailable"}]
        )

    async def test_invalid_and_edit_decisions_reject_before_any_callback_or_observation(
        self,
    ):
        async def forbidden(*_args):
            self.fail("Validation must precede execution")

        for decisions in [
            [],
            [{"type": "approve", "extra": True}],
            [{"type": "unknown"}],
            "approve",
            [{"type": []}],
        ]:
            with self.subTest(decisions=decisions), self.assertRaises(ValueError):
                await run_actions([action()], forbidden, forbidden, decisions=decisions)
        with self.assertRaisesRegex(NotImplementedError, "in_place_edit_unsupported"):
            await run_actions(
                [action(), action(id="a2")],
                forbidden,
                forbidden,
                decisions=[
                    {"type": "approve"},
                    {"type": "edit", "action": action(resource="report")},
                ],
            )

    async def test_empty_or_malformed_actions_cannot_report_success(self):
        async def forbidden(*_args):
            self.fail("Malformed input must fail before callbacks")

        for actions in [
            [],
            None,
            [{**action(), "extra": "ignored"}],
            [action(resource="../../file")],
            [action(content=7)],
        ]:
            with self.subTest(actions=actions), self.assertRaises(ValueError):
                await run_actions(actions, forbidden, forbidden)

    async def test_native_state_restore_is_required_before_execution(self):
        from agents import RunState

        async def forbidden(*_args):
            self.fail("Restoration failure must prevent callbacks")

        with (
            patch.object(
                RunState, "from_string", side_effect=RuntimeError("restore_probe")
            ),
            self.assertRaisesRegex(RuntimeError, "restore_probe"),
        ):
            await run_actions([action()], forbidden, forbidden)

    async def test_callback_exception_propagates_instead_of_becoming_successful_tool_output(
        self,
    ):
        async def execute(_action):
            raise RuntimeError("fixture_sink_failure")

        async def observe():
            return {"available": True, "effects": []}

        from agents.exceptions import UserError

        with self.assertRaisesRegex(UserError, "fixture_sink_failure") as raised:
            await run_actions([action()], execute, observe)
        self.assertIsInstance(raised.exception.__cause__, RuntimeError)


if __name__ == "__main__":
    unittest.main()
