// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Leakage-Residue: measure vsn.leakage.v1's residue, shrink the bound with an
// additive v2, sign the irreducible floor. No live-model lane, no adversarial elicitation.

export const VLR_CORPUS_SCHEMA = "simurgh.vlr.corpus.v1";
export const VLR_LEDGER_SCHEMA = "simurgh.vlr.ledger.v1";
export const VLR_ATTESTATION_SCHEMA = "simurgh.vlr.attestation.v1";
export const VLR_METAMORPHIC_TABLE_ID = "vlr.metamorphic.v1";
export const VLR_RUBRIC_ID = "vlr.claim_rubric.v1";

export const VLR_PROVENANCE = Object.freeze(["enumerated", "incident_sourced"]);

// The six leakage families each corpus item declares (spec §2 family table).
export const VLR_FAMILIES = Object.freeze([
  "digit_to_word_quantifier",
  "exact_to_hedged",
  "percent_to_fraction_phrase",
  "date_to_relative",
  "count_to_bulk_phrase",
  "true_semantic_paraphrase",
]);

// The v1 lexical rule ids the coverage_witness must exercise (mirror of the 4W gate RULES).
export const VLR_V1_COVERAGE_FAMILIES = Object.freeze([
  "digit",
  "number_word",
  "percent",
  "month",
  "quantifier",
]);

export const VLR_NON_CLAIMS = Object.freeze([
  "not_a_claim_of_semantic_leakage_closure",
  "not_a_claim_that_v2_eliminates_paraphrase_smuggling",
  "not_a_claim_that_catch_rate_is_over_the_full_paraphrase_space",
  "not_a_claim_that_ground_truth_labels_are_adjudicated",
  "not_a_claim_of_institution_independent_reproduction",
  "not_a_claim_of_model_safety",
  "not_a_claim_of_regulatory_compliance",
  "not_a_claim_that_incident_sourced_items_name_or_accuse_any_party",
  "not_a_claim_that_slip_rate_is_gate_field_performance",
]);

export const VLR_KNOWN_LIMITATIONS = Object.freeze([
  "corpus_is_a_sample_and_headline_number_is_corpus_constructible",
  "ground_truth_labels_are_author_declared_under_a_frozen_rubric",
  "v2_shrinks_but_never_closes_the_lexically_reachable_residue",
  "an_irreducible_semantic_residue_remains_measured_not_eliminated",
  "lane_b_is_process_independent_not_institution_independent",
  "ruleset_v1_and_v2_remain_english_centric",
]);

export const VLR_RAILS = Object.freeze([
  "read_only_leakage_kernel_v1_imported_unmodified",
  "residue_is_a_function_of_seed_and_signed_transform",
  "v2_is_a_measurement_ruleset_not_a_deployed_policy",
  "public_tier_is_arithmetic_audit_tier_reruns_the_gate",
  "lane_b_is_process_isolated_not_implementation_independent",
  "incident_sourced_reuses_shape_only_never_names_a_party",
  "monotonicity_recomputed_never_trusts_the_stored_flag",
  "no_live_model_lane_no_adversarial_elicitation",
]);

// Socket ledger (spec §1 ADR): the 4W adversary socket is mechanism-overfit, superseded and
// paid by measurement — never marked PAID directly.
export const VLR_SUPERSEDED_SLOTS = Object.freeze({
  semantic_leakage_adversary_deferred: "semantic_residue_measurement_deferred",
});
export const VLR_PAID_SLOT = "semantic_residue_measurement_deferred";

export const VLR_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "transparency_report_profile_deferred",
  "residue_over_submitted_narrative_deferred",
  "cross_gate_residue_benchmark_deferred",
]);
