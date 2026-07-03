// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4M frozen constants (spec §3-§4). Changing ANY value invalidates every committed digest.
export const VXD_MERGE_EVENT_SCHEMA = "simurgh.ccb.cluster_merge_event.v1"; // name 4L reserved
export const VXD_RESCORE_SCHEMA = "simurgh.vxd.retro_rescore.v1";
export const VXD_DISCLOSURE_SCHEMA = "simurgh.vxd.disclosure_claim.v1";
export const VXD_CONTEST_SCHEMA = "simurgh.vxd.respondent_contest.v1";
export const VXD_ACK_SCHEMA = "simurgh.vxd.contest_acknowledgement.v1";
export const VXD_WINDOW_SCHEMA = "simurgh.vxd.window_commitment.v1";
export const VXD_CHAIN_SCHEMA = "simurgh.vxd.chain.v1";
export const VXD_ATTESTATION_SCHEMA = "simurgh.vxd.attestation.v1";
export const VXD_MANIFEST_SCHEMA = "simurgh.vxd.manifest.v1";
export const VXD_TIER_P_SCHEMA = "simurgh.vxd.tier_p.v1";
export const VXD_PROJECTION_SCHEMA = "simurgh.vxd.article73_projection.v1";
export const VXD_VERDICT_SCHEMA = "simurgh.vxd.verdict.v1";
export const VXD_MANIFEST_DOMAIN = "SIMURGH_STAGE4M_VXD_MANIFEST_V1\0";
export const VXD_CONTEST_DOMAIN = "SIMURGH_STAGE4M_VXD_CONTEST_V1\0";

// 4L lineage: enum + denylist carried verbatim (spec §4.1).
export const MERGE_BASIS_ENUM = Object.freeze([
  "device_commitment",
  "network_bucket",
  "org_binding",
  "payment_graph",
  "reseller_path",
  "traffic_shape",
]);
export const RAW_IDENTITY_DENYLIST = Object.freeze([
  "account_id",
  "address",
  "card",
  "device_id",
  "email",
  "ip",
  "name",
  "org_name",
  "phone",
  "plaintext",
  "raw",
  "user_id",
]);

export const CONTEST_TYPES = Object.freeze([
  "arithmetic_error_alleged",
  "assignment_disputed",
  "merge_evidence_disputed",
  "window_boundary_disputed",
]);

export const CLAIM_KINDS = Object.freeze([
  "breach_count",
  "cluster_count",
  "consumer_count",
  "exposure_total",
  "window_range",
]);

// Chain entry kinds (spec §4.3): positions are indices into the single bundle chain.
export const CHAIN_KINDS = Object.freeze([
  "contest_acknowledgement",
  "disclosure_claim",
  "merge_event",
  "rescore_record",
  "respondent_contest",
  "window_commitment",
]);

export const VXD_NON_CLAIMS = Object.freeze([
  // 4L thirteen verbatim
  "not_sybil_closure",
  "not_structuring_closure_without_provider_binding",
  "not_identity_truth",
  "provider_cluster_graph_assumed",
  "not_capability_transfer_proof",
  "budget_is_declared_policy_not_safety_bound",
  "raw_identity_not_exported",
  "ledger_is_metadata_only",
  "attestation_assumes_reviewer_runtime",
  "not_model_safety",
  "not_kernel_sandboxing",
  "determinism_not_statistical_robustness",
  "complements_not_replaces_prevention_credentials",
  // 4M additions (spec §1)
  "not_legal_compliance_certification",
  "contest_is_recorded_not_adjudicated",
  "merge_evidence_not_verified",
  "retro_rescoring_is_arithmetic_not_new_measurement",
  "disclosure_binding_is_chain_ordering_not_truth",
  "projection_is_output_surface_not_filing",
]);

export const VXD_KNOWN_LIMITATIONS = Object.freeze([
  "merge_evidence_not_verified",
  "no_merge_no_reveal",
  "demand_side_evidence_digest_reserved_unbound",
  "basis_digests_opaque_slots",
  "respondent_key_binding_out_of_band",
  "proof_is_of_model_not_implementation",
  "acknowledgement_is_receipt_not_ruling",
  "browser_verifier_is_projection_not_normative",
  "disclosure_is_adversary_feedback_bounded_not_eliminated",
  "tier_r_slice_machinery_deferred",
  "bundle_recipient_vetting_out_of_band",
  "window_budgets_assumed_consistent_with_graph_policy",
  "singleton_contradiction_not_yet_bound_to_4l_cardinality_digest",
]);
