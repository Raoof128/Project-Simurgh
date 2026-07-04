// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4P frozen constants (4P spec §2, §6). Motto: AnthropicSafe First, then
// ReviewerSafe. Changing ANY value invalidates every committed digest.
export const SCHEMAS = Object.freeze({
  ENVELOPE: "simurgh.origin_custody_envelope.v1",
  HOP_RECEIPT: "simurgh.custody_hop_receipt.v1",
  CUSTODY_RECEIPT: "simurgh.custody_receipt.v1",
  CPC_SIGNAL: "simurgh.custody_class_signal.v1",
  ENFORCEMENT: "simurgh.enforcement_window_commitment.v1",
  CONTEST: "simurgh.relay_contest.v1",
  DISCLOSURE: "simurgh.vendor_custody_disclosure.v1",
  ATTESTATION: "simurgh.voca_attestation.v1",
});

export const DOMAINS = Object.freeze({
  ENVELOPE: "SIMURGH_STAGE4P_ENVELOPE_V1",
  HOP_RECEIPT: "SIMURGH_STAGE4P_HOP_RECEIPT_V1",
  CUSTODY_PATH: "SIMURGH_STAGE4P_CUSTODY_PATH_V1",
  CUSTODY_RECEIPT: "SIMURGH_STAGE4P_CUSTODY_RECEIPT_V1",
  WINDOWED_EVIDENCE: "SIMURGH_STAGE4P_WINDOWED_EVIDENCE_V1",
  CUSTODY_CLASS: "SIMURGH_STAGE4P_CUSTODY_CLASS_V1",
  SURFACE_BINDING: "SIMURGH_STAGE4P_STAGE4O_SURFACE_BINDING_V1",
  HOP_REPLAY: "SIMURGH_STAGE4P_HOP_REPLAY_V1",
  ENFORCEMENT: "SIMURGH_STAGE4P_ENFORCEMENT_V1",
  CONTEST: "SIMURGH_STAGE4P_CONTEST_V1",
  DISCLOSURE: "SIMURGH_STAGE4P_DISCLOSURE_V1",
  BRIDGE: "SIMURGH_STAGE4P_BRIDGE_V1",
  ATTESTATION_BUNDLE: "SIMURGH_STAGE4P_ATTESTATION_BUNDLE_V1",
});

export const ENUMS = Object.freeze({
  provider_family: Object.freeze(["openai", "anthropic", "local", "self_hosted", "unknown"]),
  relay_policy: Object.freeze(["direct_only", "declared_relays_allowed"]),
  account_boundary: Object.freeze(["single_declared", "declared_pool", "unknown_disallowed"]),
  trace_custody: Object.freeze([
    "provider_only",
    "declared_relay",
    "no_trace_retained",
    "unknown_disallowed",
  ]),
  trace_custody_observed: Object.freeze(["provider_only", "declared_relay", "unknown"]),
  signal_mode: Object.freeze(["matchable", "degraded_non_matchable"]),
  evidence_kind: Object.freeze([
    "relay_spki_sha256",
    "relay_signing_public_key_sha256",
    "declared_relay_instance_key_sha256",
    "self_hosted_relay_public_key_sha256",
    "low_entropy_or_unknown",
  ]),
  action_class: Object.freeze([
    "account_cluster_ban",
    "rate_restriction",
    "key_revocation",
    "other_declared",
  ]),
  bridge_mode: Object.freeze(["digest_binding_only"]),
});

// 4P spec §6.6 — deterministic entropy buckets. No probabilistic guessing.
export const ENTROPY_BITS_BY_KIND = Object.freeze({
  relay_spki_sha256: 128,
  relay_signing_public_key_sha256: 128,
  declared_relay_instance_key_sha256: 128,
  self_hosted_relay_public_key_sha256: 128,
  low_entropy_or_unknown: 0,
});
export const ENTROPY_FLOOR_BITS = 96;

export const GENESIS = "genesis";

// 4P spec §2, frozen wording — never edit, never paraphrase.
export const VOCA_NON_CLAIMS = Object.freeze([
  "not_provider_identity_oracle",
  "not_proxy_blocking_system",
  "not_grey_market_investigation",
  "not_law_enforcement_claim",
  "not_model_safety_claim",
  "not_proof_of_actual_provider_execution",
  "not_detection_of_all_proxies",
  "not_a_replacement_for_provider_abuse_detection",
  "not_model_substitution_oracle",
  "http_resale_shape_deferred_to_4p1",
  "window_anchor_is_public",
  "match_is_not_attribution",
  "private_custody_corroboration_deferred",
  "disclosure_budget_is_not_privacy_proof",
  "not_enforcement_verification",
  "not_legal_compliance_certification",
]);

// 4P spec §18, frozen — signed into the attestation as safety_rail.
export const SAFETY_RAIL =
  "Stage 4P proves properties of recorded custody evidence. It does not prove physical " +
  "network truth, provider honesty, real-world attribution, or model execution identity " +
  "outside the evidence supplied to the verifier.";
