# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3i_metrics import (
    build_benign_recovery_analysis,
    compute_over_defence,
)


def _benign(task_id, *, success, verdict, boundary):
    return {"kind": "benign", "task_id": task_id, "utility_success": success,
            "gateway_verdict": verdict, "boundary": boundary,
            "receipt_id": f"gw_{task_id}", "audit_verified": True}


def test_over_defence_counts_only_simurgh_boundary_blocks():
    rows = [
        _benign("t0", success=False, verdict="blocked", boundary="context_guard"),
        _benign("t1", success=False, verdict="accepted", boundary=None),  # model failure
        _benign("t2", success=True, verdict="accepted", boundary=None),   # passed
    ]
    out = compute_over_defence(rows)
    assert out["count"] == 1   # only the context_guard block
    assert out["total"] == 3
    assert out["rate"] == 1 / 3


def test_model_failure_not_counted_as_over_defence():
    rows = [_benign("t0", success=False, verdict="accepted", boundary=None)]
    assert compute_over_defence(rows)["count"] == 0


def test_recovery_analysis_flags_context_guard_rescope():
    rows = [
        _benign("t0", success=False, verdict="blocked", boundary="context_guard"),
        _benign("t1", success=False, verdict="blocked", boundary="context_guard"),
        _benign("t2", success=False, verdict="accepted", boundary=None),
    ]
    analysis = build_benign_recovery_analysis(rows)
    assert analysis["benign_failures"] == 3
    assert analysis["failure_class_counts"]["context_provenance_reject"] == 2
    assert analysis["failure_class_counts"]["model_failed_task"] == 1
    assert analysis["dominant_failure_class"] == "context_provenance_reject"
    assert analysis["decision_gate"] == "rescope_context_guard_adapter"


def test_recovery_analysis_flags_tool_permit_proceed():
    rows = [
        _benign("t0", success=False, verdict="blocked", boundary="tool_gate"),
        _benign("t1", success=False, verdict="blocked", boundary="tool_gate"),
        _benign("t2", success=False, verdict="blocked", boundary="context_guard"),
    ]
    analysis = build_benign_recovery_analysis(rows)
    assert analysis["dominant_failure_class"] == "tool_family_not_permitted"
    assert analysis["decision_gate"] == "proceed_tool_permit_stack"


def test_stage3i_artifacts_are_metadata_only(tmp_path):
    from simurgh_agentdojo_adapter.evidence_writer import write_json_artifacts
    from simurgh_agentdojo_adapter.layer2_runner import build_stage3i_artifacts

    defended_rows = [
        {"kind": "benign", "task_id": "user_task_0", "utility_success": False,
         "gateway_verdict": "blocked", "boundary": "context_guard",
         "receipt_id": "gw_run_001", "audit_verified": True},
        {"kind": "security", "task_id": "user_task_1",
         "security_case_id": "user_task_1::injection_task_0",
         "utility_success": False, "gateway_verdict": "blocked",
         "boundary": "context_guard", "receipt_id": "gw_run_013",
         "audit_verified": True},
    ]
    artifacts = build_stage3i_artifacts(defended_rows)
    assert set(artifacts) == {"error-taxonomy.json", "benign-recovery-analysis.json"}
    assert artifacts["benign-recovery-analysis.json"]["decision_gate"] == "rescope_context_guard_adapter"
    # must not raise EvidenceLeakage and must not contain raw task ids
    write_json_artifacts(tmp_path, artifacts)
    written = (tmp_path / "error-taxonomy.json").read_text()
    assert "user_task_0" not in written
    assert "injection_task_0" not in written
