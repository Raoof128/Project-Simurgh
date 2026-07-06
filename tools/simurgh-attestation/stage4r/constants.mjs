// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R frozen constants (4R spec §2, §3, §5, §7, §8). Motto: AnthropicSafe
// First, then ReviewerSafe. Changing ANY value invalidates every committed
// digest. CRYPTO_DOMAINS are the protocol domain-separation tags bound inside
// hashes; DOMAINS are the evidence-record digest domains. The two never mix.

// §5.1 — the seven versioned schema names.
export const SCHEMAS = Object.freeze({
  MASK_MESSAGE: "simurgh.pccc_mask_message.v1",
  MATCH_TRANSCRIPT: "simurgh.pccc_match_transcript.v1",
  MATCH_RECORD: "simurgh.pccc_match_record.v1",
  CEREMONY_CAPTURE: "simurgh.pccc_ceremony_capture.v1",
  ATTESTATION: "simurgh.pccc_attestation.v1",
  DLEQ_PROOF: "simurgh.pccc_dleq_proof.v1",
  OPERATOR_INVITATION: "simurgh.pccc_operator_invitation.v1",
});

// §3 — the seven crypto domain-separation tags. NEVER invent more.
export const CRYPTO_DOMAINS = Object.freeze({
  CLASS: "simurgh.pccc.class.v1",
  MATCH: "simurgh.pccc.match.v1",
  TOKEN_COMMIT: "simurgh.pccc.token_commit.v1",
  PAIR: "simurgh.pccc.pair.v1",
  MATCH_COMMIT: "simurgh.pccc.match_commit.v1",
  EPHEMERAL_PUB: "simurgh.pccc.ephemeral_pub.v1",
  DLEQ: "simurgh.pccc.dleq.v1",
});

// Evidence-record digest domains (distinct from CRYPTO_DOMAINS above).
export const DOMAINS = Object.freeze({
  PAIR_ID_HASH: "SIMURGH_STAGE4R_PAIR_ID_HASH_V1",
  TRANSCRIPT: "SIMURGH_STAGE4R_TRANSCRIPT_V1",
  MATCH_RECORD: "SIMURGH_STAGE4R_MATCH_RECORD_V1",
  CEREMONY_CAPTURE: "SIMURGH_STAGE4R_CEREMONY_CAPTURE_V1",
  SEALED_PACKET: "SIMURGH_STAGE4R_SEALED_PACKET_V1",
  ATTESTATION: "SIMURGH_STAGE4R_ATTESTATION_V1",
  CENSUS: "SIMURGH_STAGE4R_CENSUS_V1",
  REFUSAL: "SIMURGH_STAGE4R_REFUSAL_V1",
  INVITATION: "SIMURGH_STAGE4R_INVITATION_V1",
  PROCESS_INSTANCE: "SIMURGH_STAGE4R_PROCESS_INSTANCE_V1",
});

// §2.1 — the seven non-claims, signed into the bundle, in spec order.
export const PCCC_NON_CLAIMS = Object.freeze([
  "not_an_identity_matching_system",
  "not_a_public_membership_registry",
  "not_full_voprf_or_rfc9380_claim",
  "not_a_physical_time_claim",
  "not_proof_of_human_deliberation",
  "not_proof_of_operator_independence_beyond_process_and_key_separation",
  "not_cross_epoch_linkability_claim",
]);

// §2.2 — the six known_limitations after Amendment 1 paid the DLEQ debt.
export const PCCC_KNOWN_LIMITATIONS = Object.freeze([
  "public_tier_remains_digest_level_by_design",
  "dleq_is_fiat_shamir_random_oracle_model",
  "curve_arithmetic_is_reference_grade_not_constant_time",
  "in_repo_curve_crypto_is_reference_verifier_not_production_deployment",
  "not_a_voprf_rfc9497_protocol",
  "cross_org_operator_b_not_yet_exercised",
]);

// §7 — the seventeen honesty rails, spec-time, in spec order.
export const PCCC_RAILS = Object.freeze([
  "no_public_herd_token",
  "audit_tier_is_dleq_verified_public_tier_is_digest_level",
  "public_record_is_digest_level_full_verification_requires_audit_packet",
  "lane_a_uses_insecure_fixture_only_scalars_for_byte_reproducibility",
  "lane_b_scalars_are_ephemeral_per_match_window_and_never_written_to_disk",
  "match_is_custody_class_corroboration_not_identity_attribution",
  "hash_to_group_is_ad_hoc_domain_separated_not_rfc9380",
  "scalar_reuse_and_replay_checks_are_recorded_evidence_not_omniscience",
  "friction_gates_export_not_matching",
  "epoch_is_4n_window_anchor_not_physical_time",
  "non_matches_are_first_class_evidence_no_selective_omission",
  "commit_before_reveal_blocks_single_liar_token_copy",
  "fixture_scalar_quarantine_enforced_by_path_allowlist",
  "curve_arithmetic_is_reference_grade_not_constant_time",
  "dleq_is_fiat_shamir_random_oracle_model",
  "census_counts_are_window_scoped_and_cardinality_committed",
  "in_repo_curve_crypto_is_reference_verifier_not_production_deployment",
]);

// §5.1 — attestation verification-kind strings (first-class fields).
export const VERIFICATION_KINDS = Object.freeze({
  LANE_A: "deterministic_replay_with_fixture_scalars",
  LANE_B: "two_party_ceremony_dleq_audit_verified",
  PACKET: "sealed_transcript_packet_for_offline_verifier",
});

// §8.1 — the three terminal outcomes every class slot must reach.
export const SLOT_TERMINAL_KINDS = Object.freeze([
  "exported_match_record",
  "exported_non_match_record",
  "ledgered_export_refusal",
]);

// §3.5 — the two DLEQ relations proven per operator.
export const DLEQ_RELATION_KINDS = Object.freeze(["mask", "z"]);

export const ROLES = Object.freeze(["a", "b"]);

// 4P disclosure-budget import (§4.1), unchanged.
export const DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW = 4;

// RFC 8032 compressed point + big-endian scalar: 64 lowercase hex chars each.
export const POINT_HEX_RE = /^[0-9a-f]{64}$/;
export const SCALAR_HEX_RE = /^[0-9a-f]{64}$/;
