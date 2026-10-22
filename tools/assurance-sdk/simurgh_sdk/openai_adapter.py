# SPDX-License-Identifier: AGPL-3.0-or-later
"""Real Agents SDK approval/resume with scripted model output and external execution.

No remote model is constructed. The framework approval is a fixture decision, not
identity proof or permission to bypass the external exact-action policy. RunState
snapshots are created and restored locally; they are never accepted from a client.
"""

from __future__ import annotations

import copy
import json
from collections.abc import Awaitable, Callable
from typing import Any

from agents import (
    Agent,
    Model,
    ModelResponse,
    RunConfig,
    Runner,
    RunState,
    function_tool,
)
from agents.usage import Usage
from openai.types.responses import (
    ResponseFunctionToolCall,
    ResponseOutputMessage,
    ResponseOutputText,
)

_ACTION_FIELDS = frozenset(
    {
        "id",
        "run",
        "principal",
        "tenant",
        "operation",
        "resource",
        "content",
        "policyRevision",
    }
)


class _ScriptedActionModel(Model):
    """Two deterministic SDK-native responses: one tool request, then completion."""

    def __init__(self, action: dict[str, str], index: int):
        self._arguments = json.dumps(action, sort_keys=True, allow_nan=False)
        self._call_id = f"simurgh_sdk_action_{index}"
        self._responses = 0

    async def get_response(self, *args, **kwargs) -> ModelResponse:
        del args, kwargs
        self._responses += 1
        if self._responses == 1:
            output = [
                ResponseFunctionToolCall(
                    type="function_call",
                    name="apply_action",
                    call_id=self._call_id,
                    arguments=self._arguments,
                )
            ]
        elif self._responses == 2:
            output = [
                ResponseOutputMessage(
                    id=f"done_{self._call_id}",
                    type="message",
                    role="assistant",
                    status="completed",
                    content=[
                        ResponseOutputText(
                            type="output_text", text="done", annotations=[]
                        )
                    ],
                )
            ]
        else:
            raise RuntimeError("unexpected_scripted_model_request")
        return ModelResponse(output=output, usage=Usage(), response_id=None)

    def stream_response(self, *args, **kwargs):
        del args, kwargs
        raise NotImplementedError("scripted_streaming_not_supported")


def _validated_inputs(actions, decisions):
    if type(actions) is not list or not 1 <= len(actions) <= 100:
        raise ValueError("invalid_actions")
    for action in actions:
        if (
            type(action) is not dict
            or action.keys() != _ACTION_FIELDS
            or any(
                type(value) is not str or not 1 <= len(value) <= 256
                for value in action.values()
            )
            or action["operation"] != "write"
            or action["resource"] not in {"patch", "report"}
        ):
            raise ValueError("invalid_action")
    if decisions is None:
        decisions = [{"type": "approve"} for _ in actions]
    if type(decisions) is not list or len(decisions) != len(actions):
        raise ValueError("invalid_decisions")
    # Validate the entire sequence before any action; a late edit cannot follow an effect.
    for decision in decisions:
        if type(decision) is not dict:
            raise ValueError("invalid_decision")
        if decision.get("type") == "edit":
            raise NotImplementedError("in_place_edit_unsupported")
        if (
            decision.keys() != {"type"}
            or type(decision["type"]) is not str
            or decision["type"] not in {"approve", "reject"}
        ):
            raise ValueError("invalid_decision")
    return copy.deepcopy(actions), copy.deepcopy(decisions)


async def run_actions(
    actions: list[dict],
    execute: Callable[[dict], Awaitable[dict]],
    observe: Callable[[], Awaitable[dict]],
    *,
    decisions: list[dict] | None = None,
) -> dict[str, Any]:
    """Pause, serialize, restore, decide and resume once for each supplied action.

    The callbacks retain their owning bridge session across SDK state roundtrips.
    Only a step index is placed in serializable SDK context. Each action index gets
    a distinct SDK call ID, including repeated external action IDs, so the shared
    policy actually receives repeated proposals and can enforce its replay state.
    """
    actions, decisions = _validated_inputs(actions, decisions)
    if not callable(execute) or not callable(observe):
        raise TypeError("invalid_callbacks")
    report = {
        "framework": "openai-agents",
        "interruptions": 0,
        "resumptions": 0,
        "state_roundtrips": 0,
        "decisions": [],
        "tool_results": [],
        "pause_observations": [],
    }
    run_config = RunConfig(tracing_disabled=True, trace_include_sensitive_data=False)
    for index, (action, decision) in enumerate(zip(actions, decisions, strict=True)):
        callback_count = 0

        @function_tool(needs_approval=True, failure_error_function=None)
        async def apply_action(
            id: str,
            run: str,
            principal: str,
            tenant: str,
            operation: str,
            resource: str,
            content: str,
            policyRevision: str,
        ) -> str:
            """Submit one exact synthetic action to the separately committed execution policy."""
            nonlocal callback_count
            callback_count += 1
            proposed = {
                "id": id,
                "run": run,
                "principal": principal,
                "tenant": tenant,
                "operation": operation,
                "resource": resource,
                "content": content,
                "policyRevision": policyRevision,
            }
            result = await execute(proposed)
            if type(result) is not dict or result.get("status") not in {
                "executed",
                "denied",
                "error",
            }:
                raise RuntimeError("invalid_execution_result")
            # Record only the real execution callback's JSON result, never a synthesized verdict.
            encoded = json.dumps(result, allow_nan=False)
            report["tool_results"].append(json.loads(encoded))
            return encoded

        agent = Agent(
            name=f"simurgh_action_{index}",
            instructions="Apply the single proposed action.",
            model=_ScriptedActionModel(action, index),
            tools=[apply_action],
        )
        paused = await Runner.run(
            agent,
            "Execute the next synthetic action.",
            context={"step": index},
            max_turns=3,
            run_config=run_config,
        )
        if len(paused.interruptions) != 1 or callback_count != 0:
            raise RuntimeError("expected_native_approval_before_callback")
        report["interruptions"] += len(paused.interruptions)
        serialized = paused.to_state().to_string(
            strict_context=True, include_tracing_api_key=False
        )
        restored = await RunState.from_string(agent, serialized, strict_context=True)
        report["state_roundtrips"] += 1
        pending = restored.get_interruptions()
        if len(pending) != 1:
            raise RuntimeError("expected_restored_approval")
        observation = await observe()
        if (
            type(observation) is not dict
            or type(observation.get("available")) is not bool
            or (
                observation["available"]
                and type(observation.get("effects")) is not list
            )
            or (
                not observation["available"]
                and (
                    type(observation.get("reason")) is not str
                    or not observation["reason"]
                )
            )
        ):
            raise RuntimeError("invalid_observation")
        report["pause_observations"].append(copy.deepcopy(observation))
        if callback_count != 0:
            raise RuntimeError("callback_before_approval")
        if decision["type"] == "approve":
            restored.approve(pending[0], always_approve=False)
        else:
            restored.reject(pending[0], always_reject=False)
        report["decisions"].append(decision["type"])
        completed = await Runner.run(
            agent, restored, max_turns=3, run_config=run_config
        )
        report["resumptions"] += 1
        expected_callbacks = 1 if decision["type"] == "approve" else 0
        if (
            completed.interruptions
            or callback_count != expected_callbacks
            or completed.final_output != "done"
        ):
            raise RuntimeError("unexpected_native_resume_outcome")
    return report
