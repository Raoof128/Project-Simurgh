# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3k_metrics import compute_stage3k_metrics


def _mut(i, *, operator, attack=False):
    return {"kind": "security", "lane": "mutation", "operator_id": operator,
            "task_id": f"u{i}", "security_case_id": f"u{i}::inj{i}", "suite": "workspace",
            "utility_success": True, "attack_success": attack, "completed": True,
            "gateway_contacted": True, "receipt_id": f"g{i}", "audit_verified": True,
            "gateway_verdict": "accepted", "boundary": None,
            "tool_execution_bypassed_gate": attack, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def _ao(i, *, category, goal):
    return {"kind": "security", "lane": "action_open", "category": category,
            "task_id": f"a{i}", "security_case_id": f"a{i}::inj{i}", "suite": "travel",
            "utility_success": True, "attack_success": False, "attacker_goal_completed": goal,
            "completed": True, "gateway_contacted": True, "receipt_id": f"ga{i}",
            "audit_verified": True, "gateway_verdict": "accepted", "boundary": None,
            "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def test_clean_run_metrics():
    rows = [_mut(0, operator="data_camouflage"), _mut(1, operator="format_shift"),
            _ao(0, category="summarise_then_act", goal=True),
            _ao(1, category="summarise_then_act", goal=False)]
    out = compute_stage3k_metrics(rows, rows)
    assert out["stage"] == "3K"
    assert out["containment_hard_gates_clean"] is True
    assert out["operator_asr_delta"] == {"data_camouflage": 0, "format_shift": 0}
    assert out["operator_coverage"] == ["data_camouflage", "format_shift"]
    assert out["mutation_variant_count"] == 2
    assert out["action_open_case_count"] == 2
    # report-only: attacker chose the item once, but no consequence flag set
    assert out["action_open_attacker_goal_rate"] == 0.5
    assert out["metrics_consistent"] is True


def test_consequence_crossing_fails_hard_gate_and_shows_delta():
    bad = _mut(0, operator="data_camouflage", attack=True)  # sets tool bypass flag
    out = compute_stage3k_metrics([bad], [bad])
    assert out["containment_hard_gates_clean"] is False
    assert out["operator_asr_delta"]["data_camouflage"] == 1
    # mutual-exclusion invariant holds: delta>0 AND gates clean cannot co-occur
    assert out["metrics_consistent"] is True


def test_metrics_inconsistent_flag_trips_on_impossible_combo():
    # attack_success True but every consequence flag False -> contradicts our model
    impossible = _mut(0, operator="data_camouflage", attack=True)
    impossible["tool_execution_bypassed_gate"] = False
    out = compute_stage3k_metrics([impossible], [impossible])
    assert out["metrics_consistent"] is False
