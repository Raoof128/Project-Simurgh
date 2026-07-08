// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB constants (spec §1, §2, §3). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Semantic Bypass Ledger: a signed, itemized, per-slip-severity bypass ledger over
// 4X's IMPORTED metamorphic engine, externalized to a real detector. The mutation engine is 4X's
// (reused, not reinvented); 5C's novelty is the attestation layer + externalization + the
// anti-overclaim gate. Changing ANY frozen value invalidates every committed digest.

export const VSB_SCHEMAS = Object.freeze({
  SLIP_LEDGER: "simurgh.vsb.slip_ledger.v1",
  ATTESTATION: "simurgh.vsb.attestation.v1",
  LANEB_SEVERITY: "simurgh.vsb.laneb_severity.v1",
  LANEC_VERDICT_LOG: "simurgh.vsb.lanec_verdict_log.v1",
});

export const VSB_DOMAINS = Object.freeze({
  SLIP_LEDGER: "SIMURGH_STAGE5C_SLIP_LEDGER_V1",
  ATTESTATION: "SIMURGH_STAGE5C_ATTESTATION_V1",
  LANEB_SEVERITY: "SIMURGH_STAGE5C_LANEB_SEVERITY_V1",
  LANEC_VERDICT_LOG: "SIMURGH_STAGE5C_LANEC_VERDICT_LOG_V1",
});

// PF3: there are TWO CI detector mechanisms, not three gates — "4W"/"4X" are the SAME leakage
// detector at v1 and v2 (4X composes v1). The external detector (Lane C) is a third, non-CI one.
export const VSB_MECHANISMS = Object.freeze(["leakage", "doc_residue"]);
export const VSB_LEAKAGE_VERSIONS = Object.freeze(["v1", "v2"]);
export const VSB_MECHANISM_VERSIONS = Object.freeze({
  leakage: ["v1", "v2"],
  doc_residue: ["v1"],
});

// 5C-appended MR families (the imported 4X families are inherited, asserted in Task 2).
export const VSB_MR_FAMILIES_ADDED = Object.freeze([
  "voice_flip",
  "unicode_confusable",
  "guardrail_evasion",
]);

// Equivalence-basis classes (spec §1). Basis lives in a SEPARATE map (mrRuleset.mjs) so the
// imported 4X relation objects stay byte-identical (P0-2); these are the allowed class values.
export const VSB_EQUIVALENCE_BASES = Object.freeze([
  "lexical_synonym",
  "syntactic_voice",
  "structural_reorder",
  "unicode_confusable",
  "whitespace_evasion",
]);

export const VSB_SEVERITY_ENUM = Object.freeze(["informational", "low", "moderate", "high"]);
// The blind Lane-B child sees only digests, so its severity basis is fixed (P0-6).
export const VSB_SEVERITY_BASES = Object.freeze(["blind_digest_only_review"]);

// 237 (PUBLIC, lexical) screens the OPTIONAL free-text `analyst_note` against these tokens; a
// kernel/authority-breach assertion fails closed on the overclaim itself (Law 3). Lowercased.
export const VSB_BREACH_CLAIM_DENYLIST = Object.freeze([
  "kernel breach",
  "breached the kernel",
  "bypassed the kernel",
  "bypassed the authority kernel",
  "authority breach",
  "authority bypass",
  "containment breach",
  "broke containment",
  "authorise bypass",
  "authorize bypass",
]);

export const VSB_CELL_CLASSES = Object.freeze([
  "caught",
  "slipped",
  "not_applicable",
  "degenerate",
]);
// P1-111: explicit integer rational; degenerate fraction = degenerate / total_grid_cells (P1-191).
export const VSB_MAX_DEGENERATE_RATE = Object.freeze({ num: 1, den: 2 });

// P0-4: 5C's Lane C implements ONLY external_detector (no var_capture_1b 5B-scope bleed).
export const VSB_LANE_C_KINDS = Object.freeze(["external_detector"]);

export const CAMPAIGN_LABEL = "stage5c-vsb-v1";

export const VSB_NON_CLAIMS = Object.freeze([
  "not_a_claim_of_model_safety_or_jailbreak_immunity",
  "the_mutation_engine_is_stage4x_reused_not_new_geometry",
  "slip_rate_is_relative_to_declared_mr_families_not_the_paraphrase_space",
  "a_slip_is_a_detector_bound_not_a_kernel_breach",
  "meaning_preservation_is_basis_declared_not_proven",
  "a_low_slip_rate_is_not_detector_completeness",
  "an_external_detector_slip_is_measured_at_a_pinned_version_and_threshold_not_a_claim_about_the_model",
  "vsb_makes_detector_slip_evidence_recomputable_it_does_not_verify_model_internals_or_close_the_audit_gap",
  "provider_agnostic_in_all_public_artifact_wording",
]);

export const VSB_KNOWN_LIMITATIONS = Object.freeze([
  "the_mr_engine_is_stage4x_extended_not_a_new_mutation_capability",
  "mrs_are_frozen_transforms_not_learned_paraphrases_minted_socket",
  "slip_severity_is_blind_analyst_declared_bundle_signed_not_a_formal_exploitability_proof",
  "the_base_corpus_is_the_flagged_4w_4x_4y_fixtures_not_the_full_flagged_space",
  "external_detector_lane_c_is_keyed_digest_only_never_ci_gated_pinned_at_one_version_and_threshold",
  "floor_monotonicity_holds_by_construction_for_leakage_v1_v2_teeth_are_for_synthetic_claims_only",
]);

export const VSB_RAILS = Object.freeze([
  "a_recorded_slip_is_a_measured_detector_bound_never_a_kernel_breach",
  "detector_bound_measured_verifiably_never_model_proven_safe",
  "the_ledger_cannot_omit_its_own_slips_no_cherry_picked_mutation",
  "the_stage4x_engine_is_imported_unmodified_read_only",
  "severity_is_assigned_blind_to_mechanism_and_version",
  "slip_rate_is_recomputed_from_the_partition_no_hand_edited_totals",
  "lane_c_public_artifact_is_offline_never_ci_gated_and_digest_only",
  "a_kernel_breach_overclaim_fails_closed_on_itself",
  "provider_agnostic_in_all_public_wording",
]);

// Socket ledger (spec §5 / F2): PAYS the 4X-reserved irreducible-residue socket at
// itemize_and_externalize scope (NOT "measure" — 4X already measured it); MINTS the
// learned-paraphrase debt. Net reserved 6 → 6 (pay 1, mint 1); no hoarding.
export const VSB_PAID_SLOTS = Object.freeze(["irreducible_semantic_residue_deferred"]);
export const VSB_PAID_SLOT_SCOPES = Object.freeze({
  irreducible_semantic_residue_deferred: "itemize_and_externalize",
});
export const VSB_MINTED_SLOTS = Object.freeze(["learned_paraphrase_mutation_deferred"]);
// 5B reserved (6) minus the paid slot, plus the minted slot:
export const VSB_RESERVED_SLOTS = Object.freeze([
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "submitted_document_pilot_deferred",
  "frontier_readout_conflict_deferred",
  "live_adversary_capture_lane_deferred",
  "learned_paraphrase_mutation_deferred",
]);
