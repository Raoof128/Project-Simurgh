# SPDX-License-Identifier: AGPL-3.0-or-later
import json

from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts
from simurgh_agentdojo_adapter.stage3k_runner import (
    build_stage3k_artifacts,
    collect_stage3j_evidence_hashes,
)


def _mut(i, *, operator):
    return {"kind": "security", "lane": "mutation", "operator_id": operator,
            "task_id": f"u{i}", "security_case_id": f"u{i}::inj{i}", "suite": "workspace",
            "utility_success": True, "attack_success": False, "completed": True,
            "gateway_contacted": True, "receipt_id": f"g{i}", "audit_verified": True,
            "gateway_verdict": "accepted", "boundary": None,
            "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def _ao(i, *, category):
    return {"kind": "security", "lane": "action_open", "category": category,
            "task_id": f"a{i}", "security_case_id": f"a{i}::inj{i}", "suite": "travel",
            "utility_success": True, "attack_success": False, "attacker_goal_completed": False,
            "completed": True, "gateway_contacted": True, "receipt_id": f"ga{i}",
            "audit_verified": True, "gateway_verdict": "accepted", "boundary": None,
            "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def test_aggregator_emits_eight_metadata_only_artifacts(tmp_path):
    rows = [_mut(0, operator="data_camouflage"), _ao(0, category="summarise_then_act")]
    manifest = {"stage": "3K", "claiming_lanes": ["3K-A", "3K-B"]}
    mutation_manifest = {"stage": "3K", "mutation_variant_count": 1,
                         "operator_coverage": ["data_camouflage"], "seed": 7,
                         "entries": [{"variant_hash": "a" * 64, "source_case_hash": "b" * 64,
                                      "operator_id": "data_camouflage", "operator_params_hash": "c" * 64}]}
    action_open_manifest = {"stage": "3K", "action_open_case_count": 1,
                            "per_suite": {"travel": 1}, "per_category": {"summarise_then_act": 1},
                            "entries": []}
    artifacts = build_stage3k_artifacts(
        rows, rows, manifest=manifest, mutation_manifest=mutation_manifest,
        action_open_manifest=action_open_manifest,
    )
    assert set(artifacts) == {
        "manifest.json", "mutation-manifest.json", "source-case-map.json",
        "action-open-manifest.json", "metrics.json", "suite-breakdown.json",
        "operator-breakdown.json", "taxonomy.json",
    }
    assert artifacts["metrics.json"]["stage"] == "3K"
    assert artifacts["suite-breakdown.json"]["stage"] == "3K"
    assert artifacts["source-case-map.json"]["entries"]["b" * 64] == 1
    write_json_artifacts(tmp_path, artifacts)
    text = (tmp_path / "metrics.json").read_text()
    assert "user_task_" not in text
    assert "injection_task_" not in text


def test_collect_stage3j_evidence_hashes(tmp_path):
    # empty dir -> empty mapping
    assert collect_stage3j_evidence_hashes(tmp_path) == {}
    # a present file -> 64-char hex hash keyed by filename
    (tmp_path / "all-suite-metrics.json").write_text(json.dumps({"stage": "3J"}))
    out = collect_stage3j_evidence_hashes(tmp_path)
    assert set(out) == {"all-suite-metrics.json"}
    assert len(out["all-suite-metrics.json"]) == 64
    assert all(c in "0123456789abcdef" for c in out["all-suite-metrics.json"])
