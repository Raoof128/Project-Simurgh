// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4N frozen constants (spec §5). Motto: AnthropicSafe First, then ReviewerSafe.
// Changing ANY value invalidates every committed digest.
export const SEISMOGRAPH_GENESIS_SCHEMA = "simurgh.seismograph.genesis_policy.v1";
export const SEISMOGRAPH_HEARTBEAT_SCHEMA = "simurgh.seismograph.heartbeat.v1";
export const SEISMOGRAPH_REVEAL_SCHEMA = "simurgh.seismograph.aggregate_reveal.v1";
export const SEISMOGRAPH_INCLUSION_SCHEMA = "simurgh.seismograph.inclusion_proof.v1";
export const SEISMOGRAPH_ATTESTATION_SCHEMA = "simurgh.seismograph.attestation.v1";
export const SEISMOGRAPH_MANIFEST_SCHEMA = "simurgh.seismograph.manifest.v1";
export const SEISMOGRAPH_MANIFEST_DOMAIN = "SIMURGH_STAGE4N_SEISMOGRAPH_MANIFEST_V1\0";
export const SEISMOGRAPH_CHAIN_ID = "stage4n-extraction-seismograph-v0";
export const SEISMOGRAPH_TIERS = Object.freeze(["Tier-A", "Tier-P", "Tier-R"]);

// Band policy (spec §5.1, Fix 2): exactly two declared dimensions; vector space 9;
// leakage bound ceil(log2 9) = 4 bits; budget 4 — clean policy passes with equality.
export const BAND_DIMENSIONS = Object.freeze({
  breach_count: Object.freeze(["0", "1-5", ">5"]),
  consumer_count: Object.freeze(["0", "1-10", ">10"]),
});
export const LEAKAGE_BITS_MAX = 4;
export const REVEAL_DELAY_WINDOWS = 2;

export const HEARTBEAT_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "quiet_trace_not_safe_model",
  "reporting_liveness_not_detection_guarantee",
]);
export const REVEAL_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "no_noise_byte_reproducible_coarsening",
  "freshest_oracle_value_not_revealed",
]);

// Spec §14 verbatim (slug form) — carried in the genesis policy, attestation, and docs.
export const SEISMOGRAPH_NON_CLAIMS = Object.freeze([
  "band_not_count",
  "quiet_trace_not_safe_model",
  "reporting_liveness_not_detection_guarantee",
  "synthetic_clock_not_deployment_sla",
  "equivocation_detection_requires_two_artifacts",
  "inclusion_proofs_are_bilateral_not_public",
]);

export const SEISMOGRAPH_KNOWN_LIMITATIONS = Object.freeze([
  "detection_completeness_not_claimed",
  "inherits_4l_provider_supplied_cluster_commitment_assumption",
  "private_side_modelled_in_repo_synthetic_v0",
  "proof_is_of_model_not_implementation",
  "publication_refusal_only_made_visible_not_prevented",
  "respondent_contests_anchored_not_adjudicated",
  "reveal_commitment_binding_not_hiding_low_entropy_v0",
]);

// Q16 public-surface scan (spec §6, Fix 5): any of these keys in a PUBLIC artifact is a
// raw-54 violation — inclusion proofs, tier labels, and respondent material are bilateral.
export const PUBLIC_FORBIDDEN_KEYS = Object.freeze([
  "bundle_tier",
  "included_under",
  "proof_path",
  "respondent_id_digest",
]);
