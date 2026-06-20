# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3j_metrics import compute_stage3j_metrics


def _benign(i, *, success, verdict="accepted", boundary=None):
    return {"kind": "benign", "task_id": f"u{i}", "suite": "workspace",
            "utility_success": success, "completed": True,
            "gateway_contacted": True, "receipt_id": f"gw{i}", "audit_verified": True,
            "gateway_verdict": verdict, "boundary": boundary,
            "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def _sec(i, *, attack, util=True):
    return {"kind": "security", "task_id": f"u{i}", "security_case_id": f"u{i}::inj{i}",
            "suite": "workspace", "utility_success": util, "attack_success": attack,
            "completed": True, "gateway_contacted": True, "receipt_id": f"gs{i}",
            "audit_verified": True, "gateway_verdict": "accepted", "boundary": None,
            "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
            "context_authority_escalated": False, "generated_evidence_leakage": False}


def test_metrics_handle_arbitrary_counts_and_compute_hard_gates():
    baseline = [_benign(i, success=True) for i in range(13)] + [_sec(i, attack=False) for i in range(7)]
    defended = [_benign(i, success=True) for i in range(13)] + [_sec(i, attack=False) for i in range(7)]
    out = compute_stage3j_metrics(baseline, defended)
    assert out["stage"] == "3J"
    assert out["counts"] == {"benign": 13, "security": 7}
    assert out["agentdojo_native_metrics"]["defended"]["benign_utility"]["counts"] == "13/13"
    assert out["agentdojo_native_metrics"]["defended"]["targeted_asr"]["counts"] == "0/7"
    assert out["hard_gates_clean"] is True


def test_hard_gates_fail_on_unsafe_tool_execution():
    bad = _benign(0, success=True)
    bad["tool_execution_bypassed_gate"] = True
    out = compute_stage3j_metrics([bad], [bad])
    assert out["hard_gates_clean"] is False


def test_build_stage3j_artifacts_metadata_only(tmp_path):
    from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts
    from simurgh_agentdojo_adapter.stage3j_full_runner import build_stage3j_artifacts

    benign = _benign(0, success=True)
    benign["suite"] = "workspace"
    # a blocked security case so the taxonomy is non-empty and the raw-id check is real
    blocked = _sec(0, attack=False)
    blocked.update({"suite": "workspace", "gateway_verdict": "blocked", "boundary": "context_guard"})
    rows = [benign, blocked]
    artifacts = build_stage3j_artifacts(rows, rows, scope="workspace")
    assert set(artifacts) == {
        "workspace-metrics.json",
        "workspace-suite-breakdown.json",
        "workspace-taxonomy.json",
    }
    assert artifacts["workspace-metrics.json"]["hard_gates_clean"] is True
    assert len(artifacts["workspace-taxonomy.json"]["entries"]) >= 1
    # metadata-only contract holds (raises EvidenceLeakage otherwise)
    write_json_artifacts(tmp_path, artifacts)
    text = (tmp_path / "workspace-taxonomy.json").read_text()
    assert "u0" not in text
    assert "user_task_" not in text
    assert "injection_task_" not in text
