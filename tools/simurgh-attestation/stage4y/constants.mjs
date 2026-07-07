// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Document Residue: a signed, byte-reproducible, content-free structural residue
// map over an arbitrary submitted document. No live-model lane, no evasion search.

export const VDR_DOCUMENT_SCHEMA = "simurgh.vdr.document.v1";
export const VDR_MAP_SCHEMA = "simurgh.vdr.map.v1";
export const VDR_AUDIT_SCHEMA = "simurgh.vdr.audit.v1";
export const VDR_ATTESTATION_SCHEMA = "simurgh.vdr.attestation.v1";

// The four region classes of the total partition (spec §2 region model).
export const VDR_REGION_CLASSES = Object.freeze([
  "caught_v1",
  "caught_v2_only",
  "redacted",
  "unflagged",
]);

// Overlap precedence (Law 1): redacted > caught_v1 > caught_v2_only > unflagged.
// Lower rank wins a contested byte. A v2 hit overlapping a v1 hit is caught_v1.
export const VDR_CLASS_PRECEDENCE = Object.freeze({
  redacted: 0,
  caught_v1: 1,
  caught_v2_only: 2,
  unflagged: 3,
});

// Fixed marker lexicon for the intrinsic 183 scan (spec §2). A run of U+2588 FULL BLOCK
// or the literal token [REDACTED] outside a declared region is undeclared_redaction_marker.
export const VDR_REDACTION_MARKERS = Object.freeze([
  { id: "full_block_run", pattern: "█+" },
  { id: "redacted_literal", literal: "[REDACTED]" },
]);

export const VDR_NON_CLAIMS = Object.freeze([
  "not_a_judgment_of_document_truth_quality_or_compliance",
  "not_a_leakage_detector_unflagged_means_outside_lexical_reach",
  "not_a_privacy_guarantee_public_maps_expose_structure",
  "not_a_paraphrase_space_coverage_claim",
  "not_a_disclosure_of_hidden_operational_controls",
  "not_a_claim_of_byte_correctness_at_public_tier",
  "not_a_claim_of_institution_independent_reproduction",
  "not_a_claim_of_model_safety",
  "not_a_claim_of_regulatory_compliance",
  "not_an_accusation_fixtures_are_shape_only",
  "not_a_claim_that_conservative_marker_detection_covers_prose_mentions",
]);

export const VDR_KNOWN_LIMITATIONS = Object.freeze([
  "lexical_english_centric_reach_inherited_from_v1_v2",
  "shadow_fragility_measured_under_six_frozen_transforms_only",
  "no_external_submitter_yet_all_fixtures_self_authored",
  "reconciliation_requires_redactor_manifest_and_segment_map",
  "public_tier_proves_structure_and_binding_never_byte_correctness",
  "lane_b_process_isolated_not_implementation_independent",
  "span_extractor_is_stage4y_code_gate_agreement_machine_checked_not_assumed",
  "literal_marker_detection_is_conservative_prose_must_escape_or_declare",
]);

export const VDR_RAILS = Object.freeze([
  "no_evasion_search_fixed_transform_table_only",
  "gate_is_public_lexicon",
  "map_is_content_free_at_public_tier",
  "fixture_documents_never_name_a_party",
  "read_only_kernel",
]);

// Socket ledger (spec §1 ADR): 4Y PAYS the 4X-minted submitted-narrative debt and mints
// ONE new debt (the external-party pilot). The paid slot is never left in reserved.
export const VDR_PAID_SLOT = "residue_over_submitted_narrative_deferred";
export const VDR_MINTED_SLOTS = Object.freeze(["submitted_document_pilot_deferred"]);
export const VDR_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "transparency_report_profile_deferred",
  "cross_gate_residue_benchmark_deferred",
  "submitted_document_pilot_deferred",
]);
