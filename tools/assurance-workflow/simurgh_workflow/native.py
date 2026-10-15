# SPDX-License-Identifier: AGPL-3.0-or-later
"""Native SDK checkpoints; only verified, locally generated snapshots reach here."""

import asyncio
import json
import tempfile
from pathlib import Path
from typing import TypedDict

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
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from langsmith import tracing_context
from openai.types.responses import (
    ResponseFunctionToolCall,
    ResponseOutputMessage,
    ResponseOutputText,
)


class ScriptedModel(Model):
    def __init__(self, action, finishing):
        self.action = action
        self.finishing = finishing
        self.calls = 0

    async def get_response(self, *args, **kwargs):
        self.calls += 1
        if self.calls != 1:
            raise RuntimeError("unexpected_model_call")
        if self.finishing:
            output = [
                ResponseOutputMessage(
                    id="done",
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
            output = [
                ResponseFunctionToolCall(
                    type="function_call",
                    name="apply_action",
                    call_id="workflow_action",
                    arguments=json.dumps(self.action, sort_keys=True),
                )
            ]
        return ModelResponse(output=output, usage=Usage(), response_id=None)

    def stream_response(self, *args, **kwargs):
        raise NotImplementedError("streaming_not_supported")


async def openai_flow(action, identity, execute, snapshot=None, decision=None):
    results = []

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
        """Submit the exact proposal to the current host authorization boundary."""
        value = execute(
            {
                "id": id,
                "run": run,
                "principal": principal,
                "tenant": tenant,
                "operation": operation,
                "resource": resource,
                "content": content,
                "policyRevision": policyRevision,
            }
        )
        results.append(value)
        return json.dumps(value, allow_nan=False)

    agent = Agent(
        name="simurgh_persisted_action",
        instructions="Apply one proposed action.",
        model=ScriptedModel(action, snapshot is not None),
        tools=[apply_action],
    )
    config = RunConfig(tracing_disabled=True, trace_include_sensitive_data=False)
    if snapshot is None:
        paused = await Runner.run(
            agent,
            "Execute the synthetic action.",
            context={"workflow": identity},
            max_turns=3,
            run_config=config,
        )
        if len(paused.interruptions) != 1 or results:
            raise RuntimeError("approval_boundary_failed")
        return (
            paused.to_state()
            .to_string(strict_context=True, include_tracing_api_key=False)
            .encode()
        )
    restored = await RunState.from_string(agent, snapshot.decode(), strict_context=True)
    pending = restored.get_interruptions()
    if len(pending) != 1:
        raise ValueError("native_checkpoint_not_paused")
    if decision == "approve":
        restored.approve(pending[0], always_approve=False)
    else:
        restored.reject(pending[0], always_reject=False)
    completed = await Runner.run(agent, restored, max_turns=3, run_config=config)
    if (
        completed.interruptions
        or completed.final_output != "done"
        or len(results) != int(decision == "approve")
    ):
        raise RuntimeError("native_completion_mismatch")
    return results


class State(TypedDict, total=False):
    action: dict
    decision: str
    tool_result: dict


def langgraph_flow(action, identity, execute, directory, snapshot=None, decision=None):
    results = []

    def approval(state):
        choice = interrupt({"action": state["action"]})
        if choice not in ("approve", "reject"):
            raise ValueError("invalid_native_decision")
        return {"decision": choice}

    def dispatch(state):
        value = execute(state["action"])
        results.append(value)
        return {"tool_result": value}

    builder = StateGraph(State)
    builder.add_node("approval", approval)
    builder.add_node("execution", dispatch)
    builder.add_edge(START, "approval")
    builder.add_conditional_edges(
        "approval",
        lambda state: state["decision"],
        {"reject": END, "approve": "execution"},
    )
    builder.add_edge("execution", END)
    with (
        tempfile.TemporaryDirectory(
            prefix="sw-native-", dir=directory
        ) as working_directory,
        tracing_context(enabled=False),
    ):
        path = Path(working_directory) / "native.sqlite3"
        if snapshot is not None:
            path.write_bytes(snapshot)
        with SqliteSaver.from_conn_string(str(path)) as saver:
            graph = builder.compile(checkpointer=saver)
            config = {"configurable": {"thread_id": identity}}
            if snapshot is None:
                paused = graph.invoke({"action": action}, config)
                if len(paused.get("__interrupt__", ())) != 1 or results:
                    raise RuntimeError("approval_boundary_failed")
            else:
                state = graph.get_state(config)
                if state.values.get("action") != action or len(state.interrupts) != 1:
                    raise ValueError("native_checkpoint_not_paused")
                completed = graph.invoke(Command(resume=decision), config)
                if completed.get("__interrupt__") or len(results) != int(
                    decision == "approve"
                ):
                    raise RuntimeError("native_completion_mismatch")
            saver.conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        return path.read_bytes() if snapshot is None else results


def native_pause(framework, action, identity, execute, *, directory):
    if framework == "openai-agents":
        return asyncio.run(openai_flow(action, identity, execute))
    return langgraph_flow(action, identity, execute, directory)


def native_resume(
    framework, action, identity, execute, snapshot, decision, *, directory
):
    if framework == "openai-agents":
        return asyncio.run(openai_flow(action, identity, execute, snapshot, decision))
    return langgraph_flow(action, identity, execute, directory, snapshot, decision)
