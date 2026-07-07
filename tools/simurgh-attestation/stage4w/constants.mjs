// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W VSN constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
export const VSN_NARRATIVE_SCHEMA = "simurgh.vsn.narrative.v1";
export const VSN_LANE_A_CORPUS_SCHEMA = "simurgh.vsn.lane_a_corpus.v1";
export const VSN_LANEB_CAPTURE_SCHEMA = "simurgh.vsn.laneb_capture.v1";
export const VSN_LANEC_CAPTURE_SCHEMA = "simurgh.vsn.lane_c_capture.v1";
export const VSN_ATTESTATION_SCHEMA = "simurgh.vsn.attestation.v1";
export const VSN_BRIDGE_STATEMENT_SCHEMA = "https://in-toto.io/Statement/v1";
export const VSN_BRIDGE_PREDICATE_TYPE = "https://simurgh.dev/vsn/bridge/v1";

export const SPAN_TYPES = Object.freeze(["slot_bound", "judgment", "unverified_prose"]);
export const AUTHOR_ROLES = Object.freeze(["operator", "drafting_model_operator_signed"]);

// Leakage ruleset v1 (spec §2) — frozen lexical lists, English-centric (signed limitation 2).
export const LEAKAGE_RULESET_ID = "vsn.leakage.v1";
export const LEAKAGE_NUMBER_WORDS = Object.freeze([
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
  "hundred",
  "thousand",
  "million",
  "billion",
  "trillion",
  "dozen",
  "half",
  "couple",
]);
export const LEAKAGE_QUANTIFIERS = Object.freeze([
  "all",
  "none",
  "most",
  "every",
  "nearly",
  "almost",
  "majority",
  "nobody",
  "no one",
]);
export const LEAKAGE_MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

export const VSN_NON_CLAIMS = Object.freeze([
  "not_a_claim_of_truthful_narrative",
  "not_a_claim_of_semantic_leakage_completeness",
  "not_a_claim_that_judgments_are_adjudicated",
  "not_a_claim_of_authorship_integrity",
  "lane_c_live_capture_is_not_byte_reproducible_without_provider_key_and_model_state",
  "lane_c_digest_check_is_not_transcript_reproduction",
  "not_a_claim_of_incident_completeness",
  "not_a_claim_of_model_safety",
  "not_a_claim_of_regulatory_compliance",
  "not_a_claim_that_density_measures_quality",
]);
export const VSN_KNOWN_LIMITATIONS = Object.freeze([
  "leakage_gate_is_lexical_not_semantic_paraphrase_smuggling_is_4x_surface",
  "leakage_ruleset_v1_is_english_centric",
  "lane_a_and_b_parties_built_by_us",
  "leakage_lexicon_is_registry_bounded",
  "lane_c_capture_not_reproducible_without_provider_key",
]);
export const VSN_RAILS = Object.freeze([
  "read_only_kernel_no_authorise_entry",
  "undeclared_claim_looking_text_fails_closed",
  "narrative_never_expands_the_evidence_set",
  "no_cloned_court_status_derivation_imported_from_4v",
  "no_view_may_hide_or_downgrade_a_span_type_marker",
  "density_is_derived_never_filed",
  "leakage_ruleset_version_sealed_inside_signed_bundle",
  "no_raw_transcripts_inside_narrative_bundle",
  "voice_carries_zero_evidentiary_weight",
]);
export const VSN_RESERVED_SLOTS = Object.freeze([
  "semantic_leakage_adversary_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "transparency_report_profile_deferred",
]);
