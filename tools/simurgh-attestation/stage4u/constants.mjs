// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U frozen constants (4U spec §2, §3, §5). Motto: AnthropicSafe First,
// then ReviewerSafe. Changing ANY value invalidates every committed digest.
export const SCHEMAS = Object.freeze({
  CHARTER: "simurgh.vrta_red_team_charter.v1",
  ATTACK_MANIFEST: "simurgh.vrta_attack_manifest.v1",
  ATTACK_FIXTURE: "simurgh.vrta_attack_fixture.v1",
  FINDING: "simurgh.vrta_finding_record.v1",
  ATTESTATION: "simurgh.vrta_attestation.v1",
});
export const DOMAINS = Object.freeze({
  CHARTER: "SIMURGH_STAGE4U_CHARTER_V1",
  MANIFEST_LEAF: "SIMURGH_STAGE4U_MANIFEST_LEAF_V1",
  FIXTURE: "SIMURGH_STAGE4U_FIXTURE_V1",
  FINDING: "SIMURGH_STAGE4U_FINDING_V1",
  ATTESTATION: "SIMURGH_STAGE4U_ATTESTATION_V1",
});
// §5 — eight attack families, spec order.
export const ATTACK_FAMILIES = Object.freeze([
  "ghost_hop",
  "structuring_budget",
  "scope_escalation",
  "crypto_signature",
  "structural_forgery",
  "fable_adaptive",
  "verifier_oracle",
  "differential",
]);
// §3.1 — precommitted schedule.
export const CAMPAIGN_SEED = "stage4u-vrta-seed-v1";
export const FAMILY_COUNTS = Object.freeze({
  ghost_hop: 8,
  structuring_budget: 8,
  scope_escalation: 8,
  crypto_signature: 8,
  structural_forgery: 6,
  fable_adaptive: 4,
  verifier_oracle: 8,
  differential: 8,
});
export const OUTCOME_CLASSES = Object.freeze(["survived", "bypass", "model_refused", "lane_disabled"]);
// §2.1 — non-claims, signed, spec order.
export const VRTA_NON_CLAIMS = Object.freeze([
  "not_a_proof_of_model_safety",
  "not_a_jailbreak_immunity_claim",
  "not_a_production_security_certification",
  "not_an_exhaustive_attack_space_claim",
  "not_a_claim_that_a_green_corpus_means_no_vulnerabilities_exist",
  "not_a_third_party_targeting_or_offensive_tool",
  "not_a_legal_or_compliance_authorization",
]);
// §2.2 — known limitations, signed, spec order.
export const VRTA_KNOWN_LIMITATIONS = Object.freeze([
  "corpus_is_relative_to_declared_attack_families_not_the_full_adversary_space",
  "live_fable_lane_is_one_capped_capture_not_ecosystem_scale",
  "a_green_corpus_is_evidence_of_survived_attacks_not_absence_of_bugs",
  "severity_labels_are_analyst_declared_not_a_formal_exploitability_proof",
  "non_malice_is_enforced_over_declared_endpoints_and_fixture_keys_only",
]);
// §2.3 — honesty rails, spec order (12 incl. the severity rail).
export const VRTA_RAILS = Object.freeze([
  "a_confirmed_bypass_is_a_recorded_outcome_not_a_verification_failure",
  "non_malice_charter_proves_declared_scope_not_inner_intent",
  "red_team_held_verifiable_never_system_proven_safe",
  "the_red_team_cannot_omit_its_own_successful_attacks_no_selective_omission",
  "attacks_target_only_our_own_verifier_keys_and_repo_never_third_parties",
  "fable_is_an_attack_bundle_driver_not_a_target_of_harm_no_capability_elicitation",
  "authorization_scope_and_disclosure_are_signed_before_any_attack_runs",
  "reported_asr_is_recomputed_from_pinned_inputs_no_hand_edited_totals",
  "live_lane_is_disabled_by_default_lazy_loaded_and_denial_of_wallet_capped",
  "severity_of_any_confirmed_bypass_is_signed_into_known_limitations",
  "lane_b_uses_honest_transparent_framing_we_never_evade_or_trick_fable_safeguards",
  "a_fable_refusal_is_recorded_as_outcome_never_rephrased_to_bypass_it",
]);
