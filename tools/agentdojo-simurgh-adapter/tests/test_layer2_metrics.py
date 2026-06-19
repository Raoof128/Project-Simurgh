# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.layer2_metrics import (
    MetricCounts,
    compute_agentdojo_native_results,
    compute_combined_metrics,
    compute_simurgh_containment_results,
)


def test_agentdojo_native_results_include_counts_and_percentages():
    baseline = [
        {"kind": "benign", "utility_success": True},
        {"kind": "benign", "utility_success": False},
        {"kind": "security", "attack_success": True, "utility_success": True},
        {"kind": "security", "attack_success": False, "utility_success": True},
    ]
    defended = [
        {"kind": "benign", "utility_success": True},
        {"kind": "benign", "utility_success": True},
        {"kind": "security", "attack_success": False, "utility_success": True},
        {"kind": "security", "attack_success": False, "utility_success": False},
    ]
    out = compute_agentdojo_native_results(baseline, defended)
    assert out["baseline"]["benign_utility"]["counts"] == "1/2"
    assert out["baseline"]["targeted_asr"]["counts"] == "1/2"
    assert out["defended"]["benign_utility"]["counts"] == "2/2"
    assert out["defended"]["targeted_asr"]["counts"] == "0/2"


def test_simurgh_containment_marks_baseline_not_applicable():
    defended = [
        {
            "agentdojo_run_id": "r1",
            "gateway_contacted": True,
            "receipt_id": "gw1",
            "audit_verified": True,
            "gateway_verdict": "accepted",
            "tool_execution_bypassed_gate": False,
            "unsafe_output_exported": False,
            "context_authority_escalated": False,
            "generated_evidence_leakage": False,
        },
        {
            "agentdojo_run_id": "r2",
            "gateway_contacted": True,
            "receipt_id": "gw2",
            "audit_verified": True,
            "gateway_verdict": "blocked",
            "boundary": "tool_gate",
            "tool_execution_bypassed_gate": False,
            "unsafe_output_exported": False,
            "context_authority_escalated": False,
            "generated_evidence_leakage": False,
        },
    ]
    out = compute_simurgh_containment_results(defended, baseline_run_count=2)
    assert out["baseline_simurgh_metrics"] == "not_applicable"
    assert out["defended_gateway_contact_rate"]["counts"] == "2/2"
    assert out["receipt_coverage_rate"]["counts"] == "2/2"
    assert out["boundary_distribution"]["tool_gate"] == 1


def test_combined_metrics_enforce_utility_preserved_counts():
    native = {
        "baseline": {
            "benign_utility": MetricCounts(8, 10).to_json(),
            "utility_under_attack": MetricCounts(12, 20).to_json(),
        },
        "defended": {
            "benign_utility": MetricCounts(7, 10).to_json(),
            "utility_under_attack": MetricCounts(11, 20).to_json(),
        },
    }
    containment = {
        "hard_gates": {"defended_gateway_contact_rate": 1.0},
        "over_defence_rate": MetricCounts(1, 10).to_json(),
    }
    combined = compute_combined_metrics(native, containment)
    assert combined["utility_preserved_rate"]["counts"] == "7/8"
    assert combined["baseline_has_no_simurgh_claims"] is True
    assert combined["baseline_and_defended_counts_match"] is True
