# SPDX-License-Identifier: AGPL-3.0-or-later
"""Native LangGraph approval/resume around the externally owned Simurgh boundary.

The in-memory checkpointer only lasts for this call. It supplies neither durable
replay protection nor authenticated human approval. Authority and the sink remain
in the caller's persistent execute closure, never in editable graph state.
"""

from collections.abc import Awaitable, Callable
from copy import deepcopy
from typing import Any, TypedDict
from uuid import uuid4

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from langsmith import tracing_context


class _State(TypedDict, total=False):
    action: dict[str, Any]
    decision: str
    tool_result: dict[str, Any]


def _validate_decision(value: Any) -> dict[str, Any]:
    if type(value) is not dict:
        raise ValueError("invalid_decision")
    kind = value.get("type")
    if kind in ("approve", "reject") and set(value) == {"type"}:
        return deepcopy(value)
    if (
        kind == "edit"
        and set(value) == {"type", "action"}
        and type(value["action"]) is dict
    ):
        return deepcopy(value)
    raise ValueError("invalid_decision")


async def run_actions(
    actions: list[dict],
    execute: Callable[[dict], Awaitable[dict]],
    observe: Callable[[], Awaitable[dict]],
    *,
    decisions: list[dict] | None = None,
) -> dict:
    """Interrupt, observe, and resume once per action using genuine LangGraph APIs.

    Decisions are synthetic fixture input. Editing a proposal does not grant new
    authority: the same external execute callback must enforce its original policy.
    Callback failures propagate; unavailable observations remain explicitly unavailable.
    """
    if type(actions) is not list or any(type(action) is not dict for action in actions):
        raise ValueError("invalid_actions")
    if not callable(execute) or not callable(observe):
        raise TypeError("invalid_callbacks")
    proposed = deepcopy(actions)
    if decisions is None:
        choices = [{"type": "approve"} for _ in proposed]
    else:
        if type(decisions) is not list or len(decisions) != len(proposed):
            raise ValueError("invalid_decisions")
        # Validate the complete workflow before any callback can produce an effect.
        choices = [_validate_decision(value) for value in decisions]

    def approve(state: _State) -> dict:
        # LangGraph restarts this node when resumed. Nothing above or inside the
        # interrupt may cause a tool effect, consume authority, or amend policy.
        choice = _validate_decision(interrupt({"action": deepcopy(state["action"])}))
        action = choice["action"] if choice["type"] == "edit" else state["action"]
        return {"decision": choice["type"], "action": deepcopy(action)}

    async def dispatch(state: _State) -> dict:
        return {"tool_result": deepcopy(await execute(deepcopy(state["action"])))}

    builder = StateGraph(_State)
    builder.add_node("approval", approve)
    builder.add_node("execution", dispatch)
    builder.add_edge(START, "approval")
    builder.add_conditional_edges(
        "approval",
        lambda state: "rejected" if state["decision"] == "reject" else "approved",
        {"rejected": END, "approved": "execution"},
    )
    builder.add_edge("execution", END)
    graph = builder.compile(checkpointer=InMemorySaver())
    result = {
        "framework": "langgraph",
        "interruptions": 0,
        "resumptions": 0,
        "state_roundtrips": 0,
        "decisions": [],
        "tool_results": [],
        "pause_observations": [],
    }
    run_id = uuid4().hex
    # Context-local suppression also overrides a caller's tracing environment flags.
    # No model, client, remote persistence, or remote tracing service is used.
    with tracing_context(enabled=False):
        for index, (action, decision) in enumerate(zip(proposed, choices, strict=True)):
            config = {"configurable": {"thread_id": f"{run_id}:{index}"}}
            paused = await graph.ainvoke({"action": action}, config)
            if len(paused.get("__interrupt__", ())) != 1:
                raise RuntimeError("expected_native_interrupt")
            result["interruptions"] += 1
            result["pause_observations"].append(deepcopy(await observe()))
            completed = await graph.ainvoke(Command(resume=deepcopy(decision)), config)
            if completed.get("__interrupt__"):
                raise RuntimeError("unexpected_native_interrupt")
            result["resumptions"] += 1
            result["decisions"].append(completed["decision"])
            if completed["decision"] != "reject":
                result["tool_results"].append(deepcopy(completed["tool_result"]))
    return result
