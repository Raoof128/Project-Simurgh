// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4L frozen constants (spec §3). Changing ANY value invalidates every committed digest.
export const CCB_ASSIGNMENT_SCHEMA = "simurgh.ccb.cluster_assignment.v1";
export const CCB_ASSIGNMENT_LEDGER_SCHEMA = "simurgh.ccb.assignment-ledger.v1";
export const CCB_POLICY_SCHEMA = "simurgh.ccb.cluster_budget_policy.v1";
export const CCB_ATTESTATION_SCHEMA = "simurgh.ccb.cluster_budget_attestation.v1";
export const CCB_CARDINALITY_SCHEMA = "simurgh.ccb.cluster_cardinality.v1";
export const CCB_MANIFEST_SCHEMA = "simurgh.ccb.manifest.v1";
export const CCB_MANIFEST_DOMAIN = "SIMURGH_STAGE4L_CCB_MANIFEST_V1\0";

// Reserved for Stage 4M (documented, NOT implemented here): simurgh.ccb.cluster_merge_event.v1

export const CLUSTER_BASIS_ENUM = Object.freeze([
  "device_commitment",
  "network_bucket",
  "org_binding",
  "payment_graph",
  "reseller_path",
  "traffic_shape",
]);

// Rejected by exact (lowercased) key name at any depth (spec §3.1).
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

// Exactly these ten fields per assignment; anything else fails closed.
export const ASSIGNMENT_FIELDS = Object.freeze([
  "basis_digests",
  "binding_level",
  "binding_policy_digest",
  "cluster_basis",
  "cluster_commitment",
  "consumer_id_digest",
  "graph_version_digest",
  "raw_identity_exported",
  "schema",
  "window",
]);

export const CCB_NON_CLAIMS = Object.freeze([
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
]);

export const CCB_KNOWN_LIMITATIONS = Object.freeze([
  "singleton_cluster_evasion_not_detected_but_ledgered",
  "basis_digests_opaque_slots",
  "graph_version_not_verified_in_4l",
]);
