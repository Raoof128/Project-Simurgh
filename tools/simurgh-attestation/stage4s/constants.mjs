// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S frozen constants (4S spec §2, §3). Motto: AnthropicSafe First, then
// ReviewerSafe. Changing ANY value invalidates every committed digest. SCHEMAS
// are the versioned record names; DOMAINS are the evidence-record digest
// domains bound inside hashes. ROOT_SENTINEL is the root receipt's
// self-referential root_receipt_digest value.

// §5.1 / §3 — the four versioned schema names.
export const SCHEMAS = Object.freeze({
  HOP_RECEIPT: "simurgh.vdcc_hop_receipt.v1",
  FANOUT_COMMITMENT: "simurgh.vdcc_fanout_commitment.v1",
  CROSSING_ARTIFACT: "simurgh.vdcc_crossing_artifact.v1",
  CHAIN_BUNDLE: "simurgh.vdcc_chain_bundle.v1",
});

// Evidence-record digest domains. NEVER reuse across record kinds.
export const DOMAINS = Object.freeze({
  RECEIPT: "SIMURGH_STAGE4S_RECEIPT_V1",
  FANOUT: "SIMURGH_STAGE4S_FANOUT_V1",
  CROSSING: "SIMURGH_STAGE4S_CROSSING_V1",
  BUNDLE: "SIMURGH_STAGE4S_BUNDLE_V1",
  ATTESTATION: "SIMURGH_STAGE4S_ATTESTATION_V1",
  MERKLE_LEAF: "SIMURGH_STAGE4S_MERKLE_LEAF_V1",
  MERKLE_NODE: "SIMURGH_STAGE4S_MERKLE_NODE_V1",
});

// §3.3 — the six authority-crossing kinds, in spec order.
export const CROSSING_KINDS = Object.freeze([
  "tool_execution",
  "export",
  "privilege_expansion",
  "consent_broadening",
  "disclosure_escalation",
  "destructive_mutation",
]);

// §2.1 — the seven non-claims, signed into the bundle, in spec order.
export const VDCC_NON_CLAIMS = Object.freeze([
  "not_an_agent_identity_system",
  "not_runtime_policy_enforcement_beyond_the_kernel_boundary",
  "not_a_harm_causation_proof",
  "not_an_a2a_or_mcp_protocol_extension",
  "not_a_legal_compliance_claim",
  "not_omniscience_outside_guarded_boundaries",
  "not_cross_epoch_linkability_claim",
]);

// §2.2 — the five known limitations, signed, in spec order.
export const VDCC_KNOWN_LIMITATIONS = Object.freeze([
  "lane_b_is_single_host_two_process_plus_one_mcp_hop_not_cross_org_network",
  "scopes_and_budgets_are_modelled_capability_labels",
  "completeness_is_relative_to_declared_participants_and_co_signature_discipline",
  "incident_capsule_deferred_to_stage_4t",
  "curve_and_signature_reuse_is_reference_grade_not_production_deployment",
]);

// §2.3 — the twelve honesty rails, spec-time, in spec order.
export const VDCC_RAILS = Object.freeze([
  "completeness_is_over_declared_participants_and_guarded_boundaries",
  "chain_held_verifiable_never_agents_safe",
  "hop_receipts_are_recorded_evidence_not_physical_time_truth",
  "merkle_inclusion_is_presence_not_completeness",
  "attenuation_enforcement_is_prior_art_our_claim_is_offline_recomputable_proof",
  "fanout_commitment_binds_at_window_close_not_realtime",
  "hidden_hop_detection_assumes_dual_signature_discipline_at_every_hop",
  "scopes_and_budgets_are_modelled_labels_enforced_at_kernel_boundary_only",
  "lane_b_mcp_hop_is_one_real_capture_not_ecosystem_scale",
  "non_matches_and_refusals_are_first_class_evidence_no_selective_omission",
  "lane_a_uses_insecure_fixture_only_keys_for_byte_reproducibility",
  "friction_gates_export_not_delegation",
]);

// §3.1 — root receipt self-referential sentinel (signed root_receipt_digest).
export const ROOT_SENTINEL = "self";

// RFC-style hex predicates and digest shape reused from stage4m where needed.
export const KEY_DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
