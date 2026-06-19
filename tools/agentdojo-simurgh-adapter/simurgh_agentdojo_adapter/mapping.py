# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pure translation between AgentDojo case shape and gateway run payloads.

No safety decisions are made here; the gateway verdict is authoritative.
"""

TRACK_SCENARIO = {
    "benign": "benign",
    "context_poisoning": "context_poisoning",
    "tool_injection": "tool_escalation",
    "output_leakage": "policy_leak",
    "multi_turn": "multi_turn_softening",
    "hard_negative": "hard_negative",
}


def map_case_to_run(case):
    track = case["track"]
    if track not in TRACK_SCENARIO:
        raise ValueError(f"unknown track: {track}")
    return {
        "input": case["input"],
        "contexts": case.get("contexts") or None,
        "provider_mode": "mock",
        "provider": "mock",
        "task_type": case.get("task_type", "unknown"),
        "scenario": TRACK_SCENARIO[track],
    }


def _blocking_boundary(resp):
    if resp.get("tool_gate_verdict") == "blocked":
        return "tool_gate"
    if resp.get("output_firewall_verdict") == "blocked":
        return "output_firewall"
    # context/input blocks surface only via reason codes + gateway_verdict
    codes = resp.get("reason_codes") or []
    if any("context" in c for c in codes):
        return "context_guard"
    return "input_firewall"


def verdict_to_outcome(resp):
    if resp.get("gateway_verdict") != "blocked":
        return {"blocked": False, "sentinel": None}
    codes = resp.get("reason_codes") or []
    return {
        "blocked": True,
        "sentinel": {
            "simurgh_blocked": True,
            "boundary": _blocking_boundary(resp),
            "reason_code": codes[0] if codes else "blocked",
            "receipt_id": (resp.get("receipt") or {}).get("run_id", "unknown"),
        },
    }
