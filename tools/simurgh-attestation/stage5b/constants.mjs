// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR constants (spec §0, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Adversarial Readout: a grounded red-team of the 4V→5A introspection stack, every
// attack run against a real precommitted 1B workspace-readout the adversary did not author.
// Changing ANY frozen value invalidates every committed digest.

export const VAR_SCHEMAS = Object.freeze({
  CHARTER: "simurgh.var.red_team_charter.v1",
  ATTACK_FIXTURE: "simurgh.var.attack_fixture.v1",
  CAPTURE_BINDING: "simurgh.var.capture_binding.v1",
  FINDING: "simurgh.var.finding_record.v1",
  ATTESTATION: "simurgh.var.attestation.v1",
});

export const VAR_DOMAINS = Object.freeze({
  CHARTER: "SIMURGH_STAGE5B_CHARTER_V1",
  MANIFEST_LEAF: "SIMURGH_STAGE5B_MANIFEST_LEAF_V1",
  FIXTURE: "SIMURGH_STAGE5B_FIXTURE_V1",
  FINDING: "SIMURGH_STAGE5B_FINDING_V1",
  ATTESTATION: "SIMURGH_STAGE5B_ATTESTATION_V1",
});

// The 4U outcome set verbatim (parity discipline).
export const VAR_OUTCOME_CLASSES = Object.freeze([
  "survived",
  "bypass",
  "model_refused",
  "lane_disabled",
]);

// The six frozen predecessors attacked by this stage (spec §4).
export const VAR_TARGET_STAGES = Object.freeze(["4v", "4w", "4x", "4y", "4z", "5a"]);

// Seven attack families, spec §4 order (★ = capture-grounded core; others = regression tail).
export const VAR_ATTACK_FAMILIES = Object.freeze([
  "conflict_laundering", // ★ → 5a
  "residue_paraphrase_slip", // ★ → 4x,4y (cross-gate benchmark, socket payment)
  "silent_cell_hide", // ★ → 4z
  "narrative_span_forgery", // → 4w (tail)
  "precommit_backdate", // → 5a (tail)
  "crypto_signature", // → all (tail, 4U regression)
  "capture_substitution", // ★ → self (anti-circularity guard)
]);

// Reviewer blocker 3: constants declare EXPECTED SHAPE only. Concrete per-family counts and the
// attack_manifest_root are derived from attackModel.mjs and frozen in Task 10 (after corpus
// integrity), never here — avoids freezing a manifest over an unvalidated corpus.
export const VAR_EXPECTED_FAMILY_TOTAL = 7;
export const VAR_EXPECTED_ATTACK_TOTAL = 46;

// FROZEN in Task 10B from the integrity-validated corpus (reviewer blocker 3/4): these are the
// concrete counts + Merkle root the charter binds, derived AFTER the fixture-integrity gate.
export const VAR_FAMILY_COUNTS = Object.freeze({
  capture_substitution: 6,
  conflict_laundering: 8,
  crypto_signature: 6,
  narrative_span_forgery: 6,
  precommit_backdate: 4,
  residue_paraphrase_slip: 8,
  silent_cell_hide: 8,
});
export const VAR_ATTACK_MANIFEST_ROOT =
  "sha256:f6001ddfd4d64fcc5f6b1d86e32f30c38f644124afca967ba4f392d24003636a";

export const CAMPAIGN_SEED = "stage5b-var-seed-v1";

// v1 claim-eligible span type on the 4W side (spec §4, family 4).
export const VAR_ELIGIBLE_SPAN_TYPE = "unverified_prose";

export const VAR_NON_CLAIMS = Object.freeze([
  "not_a_proof_of_model_safety_or_introspective_faithfulness",
  "not_a_jailbreak_or_deception_immunity_claim",
  "not_an_exhaustive_attack_space_claim_corpus_is_relative_to_declared_families",
  "a_survived_corpus_is_evidence_of_survived_attacks_not_absence_of_bugs",
  "not_a_third_party_targeting_or_offensive_tool_attacks_only_our_own_verifiers_and_keys",
  "the_1b_capture_is_a_grounding_substrate_not_a_frontier_scale_finding",
  "severity_labels_are_analyst_declared_not_a_formal_exploitability_proof",
  "no_author_s_map_proves_adversary_independence_of_tensors_not_of_the_benign_corpus_choice",
  "provider_agnostic_in_all_public_artifact_wording",
]);

export const VAR_KNOWN_LIMITATIONS = Object.freeze([
  "attack_corpus_is_relative_to_declared_families_not_the_full_adversary_space",
  "capture_is_1b_cpu_benign_grounding_not_frontier_scale_live_adversary_lane_deferred",
  "bypass_severity_is_analyst_declared_signed_into_this_list_not_a_formal_proof",
  "a_confirmed_bypass_if_any_is_disclosed_here_by_id_and_severity_no_silent_bypass",
  "gpu_captures_are_hash_anchored_not_bitwise_reproducible_cpu_1b_primary_is_byte_stable",
  "no_author_s_map_binds_tensor_commitments_to_the_capture_key_not_the_semantic_content",
  "lane_c_narrative_and_readout_are_a_single_benign_1b_session_not_representative",
  // Slot 8 (the signed bypass list) is APPENDED at closeout, not frozen here.
]);

export const VAR_RAILS = Object.freeze([
  "a_confirmed_bypass_is_a_recorded_outcome_not_a_verification_failure",
  "red_team_held_verifiable_never_system_proven_safe",
  "the_red_team_cannot_omit_its_own_successful_attacks_no_selective_omission",
  "attacks_target_only_our_own_verifier_keys_and_repo_never_third_parties",
  "the_attacked_capture_is_adversary_independent_no_author_s_map",
  "attack_manifest_root_and_scope_are_signed_before_the_capture_is_revealed",
  "reported_asr_is_recomputed_from_pinned_findings_no_hand_edited_totals",
  "capture_is_offline_never_ci_gated_benign_pinned_corpus_only",
  "live_adversary_lane_is_disabled_by_default_lazy_loaded_and_denial_of_wallet_capped",
  "severity_of_any_confirmed_bypass_is_signed_into_known_limitations",
  "a_model_refusal_is_recorded_as_outcome_never_rephrased_to_bypass_it",
  "no_elicitation_no_honeypots_no_misaligned_organisms_no_evasion_search_in_the_capture",
]);

// Socket ledger (spec §0 ADR): PAYS 1 full, MINTS 1, net 0; retires two non-socket signed debts
// (4U "reuses 4S table" + 4Z/5A "capture not run"). A paid slot is NEVER left reserved; the
// minted slot IS reserved (a minted socket is an IOU).
export const VAR_PAID_SLOTS = Object.freeze(["cross_gate_residue_benchmark_deferred"]);
export const VAR_MINTED_SLOTS = Object.freeze(["live_adversary_capture_lane_deferred"]);
export const VAR_PAID_SLOT_SCOPES = Object.freeze({
  cross_gate_residue_benchmark_deferred: "full",
});
// 5A reserved (6) minus the paid slot, plus the minted slot:
export const VAR_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "submitted_document_pilot_deferred",
  "frontier_readout_conflict_deferred",
  "live_adversary_capture_lane_deferred",
]);
