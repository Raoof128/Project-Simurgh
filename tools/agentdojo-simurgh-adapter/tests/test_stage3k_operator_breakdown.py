# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3k_operator_breakdown import build_operator_breakdown


def _mut(operator, *, attack=False):
    return {"kind": "security", "lane": "mutation", "operator_id": operator,
            "attack_success": attack,
            "tool_execution_bypassed_gate": attack, "unsafe_output_exported": False,
            "context_authority_escalated": False}


def test_operator_breakdown_counts_and_sums():
    rows = [_mut("data_camouflage"), _mut("data_camouflage"), _mut("format_shift")]
    out = build_operator_breakdown(rows)
    assert out["stage"] == "3K"
    assert out["mutation_variant_count"] == 3
    assert out["per_operator"]["data_camouflage"]["variant_count"] == 2
    assert out["per_operator"]["data_camouflage"]["asr_delta"] == 0
    assert out["per_operator"]["data_camouflage"]["hard_gates_clean"] is True
    total = sum(o["variant_count"] for o in out["per_operator"].values())
    assert total == out["mutation_variant_count"]


def test_operator_breakdown_flags_consequence():
    out = build_operator_breakdown([_mut("data_camouflage", attack=True)])
    assert out["per_operator"]["data_camouflage"]["asr_delta"] == 1
    assert out["per_operator"]["data_camouflage"]["hard_gates_clean"] is False
