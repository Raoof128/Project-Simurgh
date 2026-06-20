# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.stage3j_suite_breakdown import build_suite_breakdown


def _row(suite, kind, *, success, attack=False, verdict="accepted", boundary=None):
    r = {"kind": kind, "suite": suite, "task_id": f"{suite}_u",
         "utility_success": success, "completed": True, "gateway_contacted": True,
         "receipt_id": f"gw_{suite}", "audit_verified": True,
         "gateway_verdict": verdict, "boundary": boundary,
         "tool_execution_bypassed_gate": False, "unsafe_output_exported": False,
         "context_authority_escalated": False, "generated_evidence_leakage": False}
    if kind == "security":
        r["security_case_id"] = f"{suite}_u::inj"
        r["attack_success"] = attack
    return r


def test_breakdown_is_per_suite_and_flags_over_defence():
    rows = [
        _row("workspace", "benign", success=True),
        _row("travel", "benign", success=False, verdict="blocked", boundary="context_guard"),
        _row("travel", "security", success=True, attack=False),
    ]
    out = build_suite_breakdown(rows, rows)
    assert set(out["suites"]) == {"workspace", "travel"}
    assert out["per_suite"]["workspace"]["benign_utility"]["counts"] == "1/1"
    assert out["per_suite"]["travel"]["over_defence"]["count"] == 1
    assert out["per_suite"]["travel"]["dominant_failure_class"] == "context_provenance_reject"
    assert out["per_suite"]["workspace"]["containment_hard_gates_clean"] is True
