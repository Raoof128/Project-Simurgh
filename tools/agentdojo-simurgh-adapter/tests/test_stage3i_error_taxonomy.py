# SPDX-License-Identifier: AGPL-3.0-or-later
import hashlib

from simurgh_agentdojo_adapter.stage3i_error_taxonomy import (
    SIMURGH_BOUNDARY_FAILURE_CLASSES,
    build_error_taxonomy,
    classify_failure,
)


def test_context_guard_block_is_context_provenance_reject():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "blocked", "boundary": "context_guard"}
    assert classify_failure(row) == ("context_provenance_reject", "context")


def test_tool_gate_block_is_tool_family_not_permitted():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "blocked", "boundary": "tool_gate"}
    assert classify_failure(row) == ("tool_family_not_permitted", "tool")


def test_output_firewall_block_is_output_firewall_block():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "blocked", "boundary": "output_firewall"}
    assert classify_failure(row) == ("output_firewall_block", "output")


def test_blocked_without_boundary_is_input_firewall_block():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "blocked", "boundary": None}
    assert classify_failure(row) == ("input_firewall_block", "input")


def test_accepted_but_failed_is_model_failed_task():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "accepted", "boundary": None}
    assert classify_failure(row) == ("model_failed_task", "model")


def test_adapter_mapping_error_takes_precedence_over_model():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "accepted", "boundary": None,
           "adapter_mapping_error": True}
    assert classify_failure(row) == ("adapter_mapping_error", "adapter")


def test_scorer_mismatch_is_scorer_completion_mismatch():
    row = {"kind": "benign", "utility_success": False,
           "gateway_verdict": "accepted", "boundary": None,
           "scorer_mismatch": True}
    assert classify_failure(row) == ("scorer_completion_mismatch", "scorer")


def test_boundary_classes_membership():
    assert "context_provenance_reject" in SIMURGH_BOUNDARY_FAILURE_CLASSES
    assert "model_failed_task" not in SIMURGH_BOUNDARY_FAILURE_CLASSES


def test_build_taxonomy_covers_benign_failures_and_blocked_security_only():
    rows = [
        {"kind": "benign", "task_id": "user_task_0", "utility_success": True,
         "gateway_verdict": "blocked", "boundary": "context_guard",
         "receipt_id": "gw_run_001", "audit_verified": True},
        {"kind": "benign", "task_id": "user_task_1", "utility_success": False,
         "gateway_verdict": "blocked", "boundary": "context_guard",
         "receipt_id": "gw_run_002", "audit_verified": True},
        {"kind": "security", "task_id": "user_task_2",
         "security_case_id": "user_task_2::injection_task_0",
         "utility_success": False, "gateway_verdict": "blocked",
         "boundary": "context_guard", "receipt_id": "gw_run_013",
         "audit_verified": True},
        {"kind": "security", "task_id": "user_task_3",
         "security_case_id": "user_task_3::injection_task_1",
         "utility_success": True, "gateway_verdict": "accepted",
         "boundary": None, "receipt_id": "gw_run_014", "audit_verified": True},
    ]
    taxonomy = build_error_taxonomy(rows)
    # benign failure (row 1) + blocked security (row 2); skip passing-benign and accepted-security
    assert len(taxonomy) == 2
    benign_entry = next(e for e in taxonomy if e["kind"] == "benign")
    assert benign_entry["primary_failure_class"] == "context_provenance_reject"
    assert benign_entry["utility_result"] == "fail"
    assert benign_entry["audit_chain_valid"] is True
    # positional ref + hashes only — never raw ids
    assert benign_entry["case_ref"] == "benign_000"
    assert len(benign_entry["case_hash"]) == 64
    assert len(benign_entry["task_id_hash"]) == 64
    assert len(benign_entry["receipt_hash"]) == 64
    assert "case_id" not in benign_entry
    assert "task_id" not in benign_entry
    assert "security_case_id" not in benign_entry
    security_entry = next(e for e in taxonomy if e["kind"] == "security")
    assert security_entry["case_ref"] == "security_001"
    # case_hash hashes the security_case_id, not the bare task_id
    assert security_entry["case_hash"] == hashlib.sha256(
        b"user_task_2::injection_task_0"
    ).hexdigest()
