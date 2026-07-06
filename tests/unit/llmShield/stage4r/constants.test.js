// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMAS,
  CRYPTO_DOMAINS,
  DOMAINS,
  PCCC_NON_CLAIMS,
  PCCC_KNOWN_LIMITATIONS,
  PCCC_RAILS,
  VERIFICATION_KINDS,
  SLOT_TERMINAL_KINDS,
  DLEQ_RELATION_KINDS,
  DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW,
  ROLES,
  POINT_HEX_RE,
  SCALAR_HEX_RE,
} from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";

test("seven pccc schemas are frozen (spec §5.1)", () => {
  assert.deepEqual(SCHEMAS, {
    MASK_MESSAGE: "simurgh.pccc_mask_message.v1",
    MATCH_TRANSCRIPT: "simurgh.pccc_match_transcript.v1",
    MATCH_RECORD: "simurgh.pccc_match_record.v1",
    CEREMONY_CAPTURE: "simurgh.pccc_ceremony_capture.v1",
    ATTESTATION: "simurgh.pccc_attestation.v1",
    DLEQ_PROOF: "simurgh.pccc_dleq_proof.v1",
    OPERATOR_INVITATION: "simurgh.pccc_operator_invitation.v1",
  });
});

test("seven crypto domain-separation tags are frozen (spec §3)", () => {
  assert.deepEqual(CRYPTO_DOMAINS, {
    CLASS: "simurgh.pccc.class.v1",
    MATCH: "simurgh.pccc.match.v1",
    TOKEN_COMMIT: "simurgh.pccc.token_commit.v1",
    PAIR: "simurgh.pccc.pair.v1",
    MATCH_COMMIT: "simurgh.pccc.match_commit.v1",
    EPHEMERAL_PUB: "simurgh.pccc.ephemeral_pub.v1",
    DLEQ: "simurgh.pccc.dleq.v1",
  });
});

test("evidence domains are stage4r-prefixed and unique", () => {
  const values = Object.values(DOMAINS);
  for (const d of values) assert.match(d, /^SIMURGH_STAGE4R_[A-Z0-9_]+$/);
  assert.equal(new Set(values).size, values.length);
});

test("the seven non-claims are frozen verbatim (spec §2.1)", () => {
  assert.deepEqual(PCCC_NON_CLAIMS, [
    "not_an_identity_matching_system",
    "not_a_public_membership_registry",
    "not_full_voprf_or_rfc9380_claim",
    "not_a_physical_time_claim",
    "not_proof_of_human_deliberation",
    "not_proof_of_operator_independence_beyond_process_and_key_separation",
    "not_cross_epoch_linkability_claim",
  ]);
});

test("the six known_limitations are frozen verbatim (spec §2.2)", () => {
  assert.deepEqual(PCCC_KNOWN_LIMITATIONS, [
    "public_tier_remains_digest_level_by_design",
    "dleq_is_fiat_shamir_random_oracle_model",
    "curve_arithmetic_is_reference_grade_not_constant_time",
    "in_repo_curve_crypto_is_reference_verifier_not_production_deployment",
    "not_a_voprf_rfc9497_protocol",
    "cross_org_operator_b_not_yet_exercised",
  ]);
});

test("the seventeen honesty rails are frozen verbatim (spec §7)", () => {
  assert.deepEqual(PCCC_RAILS, [
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
});

test("verification kinds are the three frozen strings (spec §5.1)", () => {
  assert.deepEqual(VERIFICATION_KINDS, {
    LANE_A: "deterministic_replay_with_fixture_scalars",
    LANE_B: "two_party_ceremony_dleq_audit_verified",
    PACKET: "sealed_transcript_packet_for_offline_verifier",
  });
});

test("slot terminal kinds, dleq relations, roles, budget, and hex regexes", () => {
  assert.deepEqual(SLOT_TERMINAL_KINDS, [
    "exported_match_record",
    "exported_non_match_record",
    "ledgered_export_refusal",
  ]);
  assert.deepEqual(DLEQ_RELATION_KINDS, ["mask", "z"]);
  assert.deepEqual(ROLES, ["a", "b"]);
  assert.equal(DISCLOSURE_BUDGET_MAX_SIGNALS_PER_WINDOW, 4);
  assert.match("a".repeat(64), POINT_HEX_RE);
  assert.doesNotMatch("A".repeat(64), POINT_HEX_RE);
  assert.doesNotMatch("a".repeat(63), SCALAR_HEX_RE);
  assert.match("0".repeat(64), SCALAR_HEX_RE);
});
