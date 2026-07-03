// SPDX-License-Identifier: AGPL-3.0-or-later
export const RAW_VERIFIER_CODES = Object.freeze({
  OK: 0,
  SCHEMA_INVALID: 20,
  PROOF_SYSTEM_UNSUPPORTED: 21,
  PREMISE_DIGEST_MISMATCH: 22,
  POLICY_DIGEST_MISMATCH: 23,
  EXPLICIT_FLOW_INTEGRITY_VIOLATION: 24,
  PACK_BINDING_MISMATCH: 25,
  PROOF_STRUCTURE_INVALID: 26,
  PRIVACY_LEAK_DETECTED: 27,
  CHECKER_NOT_OFFLINE: 28,
  INTERNAL_ERROR_FAIL_CLOSED: 29,
});

export const PROOF_TAMPER_DETECTED = RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID;

export const STRUCTURE_REASONS = Object.freeze([
  "derivation_scope_incomplete",
  "proof_tamper_detected",
  "lattice_digest_mismatch",
  "proof_step_missing",
  "proof_step_unsound",
  "proof_object_carries_no_independently_checkable_derivation",
  "unknown_premise_ref",
  "duplicate_premise_ref",
  "duplicate_node_label",
  "duplicate_lattice_step",
  "duplicate_sink_safety_claim",
  "extra_node_label",
  "extra_lattice_step",
  "extra_sink_safety_claim",
  "node_label_unjustified",
  "lattice_step_invalid",
  "violation_count_mismatch",
  "sink_not_in_graph",
]);

export const PRIVACY_REASONS = Object.freeze([
  "non_enum_label",
  "unknown_label_not_in_lattice_enum",
  "opaque_or_freeform_field",
  "raw_text_in_summary",
  "raw_text_in_key",
  "raw_text_in_premise_ref",
  "over_length_field",
  "freeform_field_present",
]);

// Stage 4J PCTA raw codes (31-38). Additive: each maps to run-level 1 (contained
// finding). The wrapper stays total — 4H band codes keep their 4H mapping, unknown → 3.
export const PCTA_RAW_CODES = Object.freeze({
  AUTHORIZATION_PROOF_MISSING: 31,
  AUTHORIZATION_SIGNATURE_INVALID: 32,
  AUTHORIZATION_PROOF_STALE: 33,
  AUTHORITY_FROM_UNTRUSTED_CONTEXT: 34,
  AUTHORIZED_ACTION_MISMATCH: 35,
  ENFORCEMENT_REQUIRED_NOT_APPLIED: 36,
  PCTA_POLICY_OR_INTENT_DIGEST_MISMATCH: 37,
  AUTHORITY_SINK_UNDERDECLARED: 38,
});

export const PCTA_REASONS = Object.freeze([
  "authorization_proof_missing",
  "authorization_signature_invalid",
  "authorization_proof_stale",
  "authority_from_untrusted_context",
  "authorized_action_mismatch",
  "enforcement_required_not_applied",
  "pcta_policy_or_intent_digest_mismatch",
  "authority_sink_underdeclared",
]);

// Stage 4K EBA raw code (30). Fills the slot the 4J spec reserved for extraction-budget
// accounting. Raw 30 means EXACTLY extraction_budget_exceeded — harness/self-test failures
// are 29. Raw 39 is reserved in prose (v1 extraction_scope_violation) and NOT mapped here.
export const EBA_RAW_CODES = Object.freeze({
  EXTRACTION_BUDGET_EXCEEDED: 30,
});

export const EBA_REASONS = Object.freeze(["extraction_budget_exceeded"]);

// Stage 4L CCB raw codes (40-42). Raw 39 stays reserved (v1 extraction_scope_violation,
// prose only). Additive: each maps to run-level 1; unknown codes still fail closed to 3.
export const CCB_RAW_CODES = Object.freeze({
  CLUSTER_COMMITMENT_MISSING: 40,
  CLUSTER_BUDGET_EXCEEDED: 41,
  CLUSTER_ASSIGNMENT_MISMATCH: 42,
});

export const CCB_REASONS = Object.freeze([
  "cluster_commitment_missing",
  "cluster_budget_exceeded",
  "cluster_assignment_mismatch",
]);

export const HARNESS_CODES = Object.freeze({
  CLEAN_RUN_FALSELY_REJECTED: 19,
});

export const OFFLINE_REASONS = Object.freeze([
  "fetch_invoked",
  "http_client_invoked",
  "socket_connect_invoked",
  "dns_invoked",
  "udp_invoked",
  "subprocess_invoked",
  "model_client_present",
  "forbidden_builtin_imported",
  "hermeticity_falsifier_not_tested",
]);

export const RUN_LEVEL_BY_RAW = Object.freeze({
  0: 0,
  19: 1,
  20: 1,
  21: 1,
  22: 1,
  23: 1,
  24: 1,
  25: 1,
  26: 1,
  27: 1,
  28: 2,
  29: 3,
  30: 1,
  31: 1,
  32: 1,
  33: 1,
  34: 1,
  35: 1,
  36: 1,
  37: 1,
  38: 1,
  40: 1,
  41: 1,
  42: 1,
});

export function stage4CodeForRawCode(code) {
  return Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, code) ? RUN_LEVEL_BY_RAW[code] : 3;
}
