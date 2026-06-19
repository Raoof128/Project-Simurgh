# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.mapping import map_case_to_run, verdict_to_outcome, TRACK_SCENARIO


def test_map_tool_injection_selects_tool_escalation_scenario():
    case = {
        "case_id": "ws_tool_001",
        "track": "tool_injection",
        "input": "do it",
        "contexts": [{"content": "untrusted tool output"}],
        "task_type": "workspace.send",
    }
    run = map_case_to_run(case)
    assert run["scenario"] == "tool_escalation"
    assert run["provider_mode"] == "mock"
    assert run["input"] == "do it"
    assert run["contexts"] == [{"content": "untrusted tool output"}]


def test_track_scenario_covers_all_tracks():
    assert set(TRACK_SCENARIO) == {
        "benign",
        "context_poisoning",
        "tool_injection",
        "output_leakage",
        "multi_turn",
        "hard_negative",
    }


def test_blocked_verdict_produces_metadata_only_sentinel():
    resp = {
        "gateway_verdict": "blocked",
        "tool_gate_verdict": "blocked",
        "output_firewall_verdict": "not_called",
        "reason_codes": ["unsafe_tool"],
        "receipt": {"run_id": "gw_run_003"},
    }
    out = verdict_to_outcome(resp)
    assert out["blocked"] is True
    s = out["sentinel"]
    assert s == {
        "simurgh_blocked": True,
        "boundary": "tool_gate",
        "reason_code": "unsafe_tool",
        "receipt_id": "gw_run_003",
    }
    # no raw content leaked into the sentinel
    assert "output_text" not in s and "input" not in s


def test_accepted_verdict_has_no_sentinel():
    resp = {
        "gateway_verdict": "accepted",
        "tool_gate_verdict": "not_requested",
        "output_firewall_verdict": "safe",
        "reason_codes": [],
        "receipt": {"run_id": "gw_run_001"},
    }
    out = verdict_to_outcome(resp)
    assert out["blocked"] is False and out["sentinel"] is None
