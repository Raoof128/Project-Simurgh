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

// Stage 4M VXD raw codes (43-46). Raw 39 stays reserved (v1 extraction_scope_violation,
// prose only). Additive: each maps to run-level 1; unknown codes still fail closed to 3.
// Every VXD gate result MUST carry a `reason` from the closed enums below (spec §3).
export const VXD_RAW_CODES = Object.freeze({
  MERGE_EVENT_INVALID: 43,
  ANTI_MONOTONICITY_VIOLATION: 44,
  DISCLOSURE_CLAIM_CONFLICT: 45,
  RESPONDENT_CONTEST_INVALID: 46,
});

export const VXD_REASONS_43 = Object.freeze([
  "budget_inflation",
  "duplicate_old_cluster",
  "graph_version_mismatch",
  "invalid_merge_basis",
  "non_coarsening_split",
  "omitted_old_cluster",
  "parent_digest_mismatch",
  "raw_identity_exported",
  "schema_invalid",
  "sequence_gap",
  "unknown_old_cluster",
]);

export const VXD_REASONS_45 = Object.freeze([
  "claim_recompute_mismatch",
  "commitment_sequenced_after_disclosure",
  "pincer_slot_not_null",
  "schema_invalid",
  "unknown_claim_kind",
]);

export const VXD_REASONS_46 = Object.freeze([
  "dangling_contest_digest",
  "dangling_record_reference",
  "schema_invalid",
  "signature_invalid",
  "unknown_contest_type",
]);

// Stage 4N Extraction Seismograph raw codes (47-54). Raw 39 stays reserved (v1
// extraction_scope_violation, prose only). Additive: each maps to run-level 1; unknown
// codes still fail closed to 3. Every 4N gate result MUST carry a `reason` from the
// closed enums below (4N spec §6-§7).
export const SEISMOGRAPH_RAW_CODES = Object.freeze({
  HEARTBEAT_MISSING: 47,
  HEARTBEAT_EQUIVOCATION: 48,
  HEARTBEAT_CHAIN_ORDER_INVALID: 49,
  HEARTBEAT_COMMITMENT_MISMATCH: 50,
  HEARTBEAT_INCLUSION_PROOF_INVALID: 51,
  HEARTBEAT_REVEAL_SCHEDULE_VIOLATION: 52,
  HEARTBEAT_REVEAL_BUDGET_EXCEEDED: 53,
  HEARTBEAT_PUBLIC_DISCLOSURE_VIOLATION: 54,
});

export const SEISMOGRAPH_REASONS_47 = Object.freeze(["heartbeat_absent_for_expected_window"]);
export const SEISMOGRAPH_REASONS_48 = Object.freeze(["cross_artifact_digest_mismatch"]);
export const SEISMOGRAPH_REASONS_49 = Object.freeze([
  "duplicate_record",
  "interleave_order_violation",
  "position_discontinuity",
  "prev_digest_mismatch",
  "schema_invalid",
  "window_outside_schedule",
]);
export const SEISMOGRAPH_REASONS_50 = Object.freeze([
  "private_evidence_root_mismatch",
  "reveal_commitment_mismatch",
  "source_root_mismatch",
]);
export const SEISMOGRAPH_REASONS_51 = Object.freeze([
  "proof_path_invalid",
  "referenced_heartbeat_absent",
  "unknown_tier",
]);
export const SEISMOGRAPH_REASONS_52 = Object.freeze(["reveal_early", "reveal_overdue"]);
export const SEISMOGRAPH_REASONS_53 = Object.freeze([
  "band_vector_space_exceeds_budget",
  "self_leakage_recompute_mismatch",
  "undeclared_band_dimension",
]);
export const SEISMOGRAPH_REASONS_54 = Object.freeze([
  "inclusion_proof_material_public",
  "raw_count_public",
  "respondent_material_public",
  "tier_label_public",
]);

// Stage 4O VTSA raw codes (55-66). Additive; each maps to run-level 1; unknown codes
// still fail closed to 3. NUMERIC order is historical: 55-63 were allocated before
// 64-66. The NORMATIVE first-failure check order is VTSA_CHECK_ORDER (4O spec §6).
export const VTSA_RAW_CODES = Object.freeze({
  MANIFEST_MISSING: 55,
  MANIFEST_SIGNATURE_INVALID: 56,
  MANIFEST_EPOCH_INVALID: 57,
  SERVER_OR_TOOLSET_DIGEST_MISMATCH: 58,
  TOOL_IDENTITY_MISMATCH: 59,
  TOOL_SCHEMA_DIGEST_MISMATCH: 60,
  AUTHORITY_CLASS_UPGRADE: 61,
  DECLARED_SINK_EXPANSION: 62,
  MANIFEST_RECEIPT_BINDING_MISMATCH: 63,
  DRIFT_LAUNDERING_DETECTED: 64,
  BLIND_REAPPROVAL: 65,
  TIMELINE_BINDING_MISMATCH: 66,
});
export const VTSA_CHECK_ORDER = Object.freeze([55, 56, 57, 64, 65, 58, 59, 60, 61, 62, 63, 66]);

export const VTSA_REASONS_55 = Object.freeze(["absent", "schema_invalid"]);
export const VTSA_REASONS_56 = Object.freeze(["commitment_signature_invalid"]);
export const VTSA_REASONS_57 = Object.freeze(["run_epoch_outside_validity_window"]);
export const VTSA_REASONS_58 = Object.freeze([
  "server_id_mismatch",
  "toolset_root_recompute_mismatch",
]);
export const VTSA_REASONS_59 = Object.freeze(["tool_not_in_manifest", "inclusion_proof_invalid"]);
export const VTSA_REASONS_60 = Object.freeze(["schema_digest_mismatch"]);
export const VTSA_REASONS_61 = Object.freeze(["authority_class_upgrade"]);
export const VTSA_REASONS_62 = Object.freeze(["sink_not_declared"]);
export const VTSA_REASONS_63 = Object.freeze(["receipt_schema_invalid", "binding_mismatch"]);
export const VTSA_REASONS_64 = Object.freeze([
  "ancestry_incomplete",
  "prev_digest_mismatch",
  "delta_digest_mismatch",
  "composition_mismatch",
]);
export const VTSA_REASONS_65 = Object.freeze([
  "state_bound_broadening",
  "state_bound_incomparable",
]);
export const VTSA_REASONS_66 = Object.freeze(["timeline_root_mismatch", "chain_position_absent"]);

// Stage 4P VOCA codes (reviewed extension of the shared ledger; 4P spec §7). NUMERIC
// order is allocation order; the NORMATIVE first-failure order is VOCA_CHECK_ORDER
// (4P spec §7.1 — 78 runs right after structural validity because laundering masks
// downstream mismatches).
export const VOCA_RAW_CODES = Object.freeze({
  CUSTODY_ENVELOPE_MISSING: 67,
  CUSTODY_SIGNATURE_INVALID: 68,
  CUSTODY_EPOCH_INVALID: 69,
  ENDPOINT_ORIGIN_MISMATCH: 70,
  UNDECLARED_PROXY_HOP: 71,
  MODEL_IDENTITY_MISMATCH: 72,
  ACCOUNT_POOL_AMBIGUITY: 73,
  TRACE_CUSTODY_VIOLATION: 74,
  CUSTODY_SURFACE_REWRITE: 75,
  RELAY_TRANSFORM_UNBOUND: 76,
  CUSTODY_RECEIPT_BINDING_MISMATCH: 77,
  CUSTODY_PATH_LAUNDERING: 78,
  CPC_EMISSION_VIOLATION: 79,
});
export const VOCA_CHECK_ORDER = Object.freeze([67, 68, 69, 78, 70, 71, 72, 73, 74, 75, 76, 77, 79]);

export const VOCA_REASONS_67 = Object.freeze(["absent", "schema_invalid"]);
export const VOCA_REASONS_68 = Object.freeze([
  "envelope_signature_invalid",
  "hop_signature_invalid",
  "receipt_signature_invalid",
]);
export const VOCA_REASONS_69 = Object.freeze(["run_epoch_outside_validity_window"]);
export const VOCA_REASONS_70 = Object.freeze(["declared_endpoint_digest_mismatch"]);
export const VOCA_REASONS_71 = Object.freeze(["relay_not_declared", "relay_policy_direct_only"]);
export const VOCA_REASONS_72 = Object.freeze(["model_identity_digest_mismatch"]);
export const VOCA_REASONS_73 = Object.freeze(["account_boundary_undeclared_pool"]);
export const VOCA_REASONS_74 = Object.freeze(["trace_custody_expanded_beyond_declaration"]);
export const VOCA_REASONS_75 = Object.freeze(["stage4o_surface_binding_mismatch"]);
export const VOCA_REASONS_76 = Object.freeze(["transform_not_declared"]);
export const VOCA_REASONS_77 = Object.freeze(["receipt_schema_invalid", "binding_mismatch"]);
export const VOCA_REASONS_78 = Object.freeze([
  "missing_hop",
  "reordered_hop",
  "duplicated_hop",
  "non_linking_previous_digest",
  "terminal_response_mismatch",
]);
export const VOCA_REASONS_79 = Object.freeze([
  "below_floor_digest_emitted",
  "matchable_missing_digest",
  "degraded_carries_digest",
  "window_anchor_not_in_feed",
  "disclosure_budget_exceeded",
  "custody_class_recompute_mismatch",
  "declared_budget_mismatch",
]);

// Stage 4Q VFR codes (reviewed extension of the shared ledger; 4Q spec §2.3). NUMERIC
// order is allocation order; the NORMATIVE first-failure order is VFR_CHECK_ORDER
// (4Q spec §2.3 — 83 right after 80 because absent receipts must not surface as
// signature errors; 89 right after structural validity because laundering masks
// downstream mismatches).
export const VFR_RAW_CODES = Object.freeze({
  FRICTION_ENVELOPE_MISSING: 80,
  FRICTION_SIGNATURE_INVALID: 81,
  FRICTION_EPOCH_INVALID: 82,
  APPROVAL_RECEIPT_MISSING: 83,
  APPROVAL_DIGEST_NOT_BOUND_TO_CROSSING: 84,
  APPROVAL_CHAIN_POSITION_INVALID: 85,
  APPROVER_KEY_NOT_DISTINCT: 86,
  FRICTION_POLICY_NOT_SATISFIED: 87,
  FRICTION_RECEIPT_BINDING_MISMATCH: 88,
  FRICTION_ORDER_LAUNDERING: 89,
});
export const VFR_CHECK_ORDER = Object.freeze([80, 83, 81, 82, 89, 86, 84, 85, 87, 88]);

export const VFR_REASONS_80 = Object.freeze(["absent", "schema_invalid"]);
export const VFR_REASONS_81 = Object.freeze([
  "approval_signature_invalid",
  "crossing_signature_invalid",
  "exemption_signature_invalid",
]);
export const VFR_REASONS_82 = Object.freeze([
  "run_epoch_outside_validity_window",
  "window_straddle_exceeded",
]);
export const VFR_REASONS_83 = Object.freeze(["absent", "schema_invalid"]);
export const VFR_REASONS_84 = Object.freeze([
  "approval_binding_unresolved",
  "approval_binding_digest_mismatch",
  "binding_kind_conflict",
]);
export const VFR_REASONS_85 = Object.freeze([
  "approval_not_before_crossing",
  "chain_position_unrecomputable",
]);
export const VFR_REASONS_86 = Object.freeze(["approver_key_equals_harness_key"]);
export const VFR_REASONS_87 = Object.freeze([
  "approver_not_declared_in_policy",
  "boundary_kind_not_covered",
  "approval_exemption_not_permitted_by_policy",
]);
export const VFR_REASONS_88 = Object.freeze([
  "action_digest_mismatch",
  "request_digest_mismatch",
  "boundary_kind_mismatch",
  "run_id_mismatch",
  "window_anchor_mismatch",
  "display_digest_mismatch",
  "friction_receipt_binding_mismatch",
]);
export const VFR_REASONS_89 = Object.freeze([
  "missing_entry",
  "reordered_entry",
  "duplicated_entry",
  "non_linking_previous_digest",
  "census_mismatch",
  "refusal_entry_removed",
]);

// Stage 4R PCCC codes (reviewed extension of the shared ledger; 4R spec §6).
// NUMERIC order is allocation order; the NORMATIVE first-failure order is
// PCCC_CHECK_ORDER (4R spec §6.4 — 94 before 95/96 so a degenerate point is
// never diagnosed as reuse; 95 before 96 so a cross-epoch replay with identical
// mask bytes reads as replay, not reuse; 98 last — its refusal is the ledgered
// expected-GREEN).
export const PCCC_RAW_CODES = Object.freeze({
  PCCC_TRANSCRIPT_SCHEMA_INVALID: 90,
  OPERATOR_IDENTITY_SIGNATURE_INVALID: 91,
  MATCH_CLAIM_CONFLICT: 92,
  DDH_TRANSCRIPT_MISMATCH: 93,
  SMALL_ORDER_OR_ALL_ZERO_FAIL_CLOSED: 94,
  CROSS_EPOCH_REPLAY_DETECTED: 95,
  EPHEMERAL_KEY_REUSE_DETECTED: 96,
  DISCLOSURE_BUDGET_EXCEEDED: 97,
  VFR_EXPORT_GATE_FAILED: 98,
  PUBLIC_HERD_TOKEN_VIOLATION: 99,
});
export const PCCC_CHECK_ORDER = Object.freeze([90, 91, 94, 95, 96, 93, 92, 99, 97, 98]);

export const PCCC_REASONS_90 = Object.freeze([
  "pccc_token_commitment_missing",
  "pccc_token_commitment_opening_invalid",
  "pccc_phase_order_invalid",
  "slot_cardinality_commitment_missing",
  "slot_cardinality_mismatch",
  "slot_terminal_record_missing",
  "window_match_census_mismatch",
]);
export const PCCC_REASONS_93 = Object.freeze([
  "token_recompute_mismatch",
  "dleq_mask_proof_invalid",
  "dleq_z_proof_invalid",
]);
export const PCCC_REASONS_96 = Object.freeze([
  "mask_reuse_detected",
  "ephemeral_public_digest_reuse_detected",
]);

// Stage 4S VDCC codes (reviewed extension of the shared ledger; 4S spec §11).
// NUMERIC order is allocation order; the NORMATIVE first-failure order is
// VDCC_CHECK_ORDER (113 immediately after 103 so a split-brain child is never
// diagnosed as a cycle; 110 before 109 so a local overspend is never diagnosed
// as generic flux; 112 before 111 so "no binding at all" is never diagnosed as
// an orphan; 118 last — typed-wrapper fail-closed only).
export const VDCC_RAW_CODES = Object.freeze({
  MALFORMED_CHAIN_BUNDLE: 100,
  SIGNATURE_INVALID: 101,
  ROOT_MISSING_OR_MULTIPLE: 102,
  PARENT_DIGEST_MISMATCH: 103,
  CYCLE_DETECTED: 104,
  UNREACHABLE_NODE: 105,
  FANOUT_COUNT_MISMATCH: 106,
  FANOUT_CHILD_SET_MISMATCH: 107,
  SCOPE_ATTENUATION_VIOLATION: 108,
  BUDGET_FLUX_VIOLATION: 109,
  LOCAL_SPEND_OVERFLOW: 110,
  GHOST_HOP_DETECTED: 111,
  RECEIPTLESS_AUTHORITY_CROSSING: 112,
  SPLIT_BRAIN_CHILD: 113,
  EPOCH_REPLAY: 114,
  ROOT_REPLAY: 115,
  SPINE_REF_MISMATCH: 116,
  MERKLE_BUNDLE_MISMATCH: 117,
  INTERNAL_FAIL_CLOSED: 118,
});
export const VDCC_CHECK_ORDER = Object.freeze([
  100, 101, 102, 103, 113, 104, 105, 106, 107, 108, 110, 109, 112, 111, 114, 115, 116, 117, 118,
]);
export const VDCC_REASONS_100 = Object.freeze([
  "chain_bundle_schema_invalid",
  "receipt_schema_invalid",
  "fanout_commitment_schema_invalid",
  "crossing_artifact_schema_invalid",
  "duplicate_declared_child_digests",
  "required_signature_field_missing",
  "public_key_index_missing_or_malformed",
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
  // Stage 4M VXD codes (reviewed extension of the shared ledger; 4M spec §3).
  43: 1,
  44: 1,
  45: 1,
  46: 1,
  // Stage 4N Seismograph codes (reviewed extension of the shared ledger; 4N spec §7).
  47: 1,
  48: 1,
  49: 1,
  50: 1,
  51: 1,
  52: 1,
  53: 1,
  54: 1,
  // Stage 4O VTSA codes (reviewed extension of the shared ledger; 4O spec §6).
  55: 1,
  56: 1,
  57: 1,
  58: 1,
  59: 1,
  60: 1,
  61: 1,
  62: 1,
  63: 1,
  64: 1,
  65: 1,
  66: 1,
  // Stage 4P VOCA codes (reviewed extension of the shared ledger; 4P spec §7.2).
  67: 1,
  68: 1,
  69: 1,
  70: 1,
  71: 1,
  72: 1,
  73: 1,
  74: 1,
  75: 1,
  76: 1,
  77: 1,
  78: 1,
  79: 1,
  // Stage 4Q VFR codes (reviewed extension of the shared ledger; 4Q spec §2.3).
  80: 1,
  81: 1,
  82: 1,
  83: 1,
  84: 1,
  85: 1,
  86: 1,
  87: 1,
  88: 1,
  89: 1,
  // Stage 4R PCCC codes (reviewed extension of the shared ledger; 4R spec §6).
  90: 1,
  91: 1,
  92: 1,
  93: 1,
  94: 1,
  95: 1,
  96: 1,
  97: 1,
  98: 1,
  99: 1,
  // Stage 4S VDCC codes (reviewed extension of the shared ledger; 4S spec §11).
  100: 1,
  101: 1,
  102: 1,
  103: 1,
  104: 1,
  105: 1,
  106: 1,
  107: 1,
  108: 1,
  109: 1,
  110: 1,
  111: 1,
  112: 1,
  113: 1,
  114: 1,
  115: 1,
  116: 1,
  117: 1,
  118: 1,
});

export function stage4CodeForRawCode(code) {
  return Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, code) ? RUN_LEVEL_BY_RAW[code] : 3;
}
