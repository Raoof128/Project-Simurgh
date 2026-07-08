// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Narrative–Workspace Conflict: a signed, byte-reproducible conflict ledger
// between a 4W span-typed narrative (what the system SAYS about its internal state) and a
// 4Z attested workspace map (what a monitor's telemetry SHOWS). No live-model adversary lane.
import { SPAN_TYPES } from "../stage4w/constants.mjs";

export const VNC_CLAIM_TABLE_SCHEMA = "simurgh.vnc.claim_table.v1";
export const VNC_LEDGER_SCHEMA = "simurgh.vnc.ledger.v1";
export const VNC_REFLECTION_MANIFEST_SCHEMA = "simurgh.vnc.reflection_manifest.v1";
export const VNC_PILOT_ADAPTATION_SCHEMA = "simurgh.vnc.pilot_adaptation.v1";
export const VNC_ATTESTATION_SCHEMA = "simurgh.vnc.attestation.v1";

// The three verdicts (Law 2: total classification) and the two polarities (spec §2).
export const VNC_VERDICTS = Object.freeze(["corroborated", "contradicted", "unreadable"]);
export const VNC_POLARITIES = Object.freeze(["asserts_unflagged", "asserts_flagged"]);

// The TOTAL scope rule id (Law 3): every claim is confronted with EVERY cell of the map's
// grid — a hand-picked cell subset is forbidden, else an operator could scope a claim away
// from the cells where it fails (the 4Z total-position-rule lesson, transplanted).
export const VNC_SCOPE_RULE = "all_cells";

// v1 claim-eligible span type (spec §2): introspective self-reports are the untyped-prose
// species; judgment spans are excluded (limitation 6) and slot_bound spans are already
// evidence-bound numbers, not introspection.
export const VNC_ELIGIBLE_SPAN_TYPE = "unverified_prose";
// Re-export 4W span typing verbatim — single source of truth (4Z precedent).
export const VNC_SPAN_TYPES = SPAN_TYPES;

export const VNC_NON_CLAIMS = Object.freeze([
  "a_contradiction_is_not_a_lie_disagreement_never_which_side_is_true",
  "corroboration_is_not_faithful_introspection_lexicon_may_be_too_narrow",
  "not_deception_detection_never_model_safe",
  "claim_extraction_is_table_driven_and_lexical_not_semantic",
  "inherits_every_4z_instrument_limitation_conflicts_are_a_lower_bound",
  "zero_conflicts_is_a_valid_outcome_not_evidence_of_faithful_introspection",
  "pilot_is_artifact_scope_we_ran_the_adapter_no_external_org_did",
  "rcp_manifest_is_open_corpus_no_claim_about_any_labs_training_data",
  "precommitment_is_signature_attested_not_temporally_proven",
  "narrative_side_is_operator_typed_span_typing_is_not_model_self_knowledge",
  "provider_agnostic_in_all_public_artifact_wording",
]);

export const VNC_KNOWN_LIMITATIONS = Object.freeze([
  "table_driven_claim_extraction_the_honest_10_blocker_on_the_blade",
  "lane_c_narrative_is_a_1b_models_benign_self_summary_not_representative",
  "eval_awareness_token_set_is_operator_chosen_no_optimality_claim",
  "pilot_export_lossiness_adapter_derived_markers_audit_tier_skipped",
  "open_corpus_rcp_demo_constitution_clause_slugs_one_revision_english_only",
  "polarity_is_binary_hedged_claims_typed_judgment_not_claim_table_eligible",
  "cross_tokenizer_claim_tables_need_the_4z_lexicon_mapping_layer",
  "conflicts_at_frontier_scale_unproven_frontier_readout_conflict_deferred",
  "v1_scope_rule_is_globally_total_prompt_scoped_denial_conservatively_contradicted",
]);

export const VNC_RAILS = Object.freeze([
  "no_elicitation_no_honeypots_no_misaligned_organisms",
  "detection_side_lexicon_only",
  "benign_pinned_corpus_only",
  "capture_never_ci_gated",
  "no_evasion_search",
]);

// Socket ledger (spec §1 ADR): 5A PAYS THREE sockets (one full, two at stated scope) and
// MINTS ONE — net debt -2, the first ledger-shrinking stage. A paid slot is NEVER left in
// reserved; the minted slot IS reserved (a minted socket is an IOU).
export const VNC_PAID_SLOTS = Object.freeze([
  "workspace_narrative_conflict_deferred",
  "lab_readout_pilot_deferred",
  "reflection_corpus_provenance_deferred",
]);
export const VNC_MINTED_SLOTS = Object.freeze(["frontier_readout_conflict_deferred"]);
// Reviewer MF1: paid-slot SCOPE is a machine fact, not a comment (comments vanish at
// runtime). Every paid slot has exactly one scope; asserted set-equal to VNC_PAID_SLOTS.
export const VNC_PAID_SLOT_SCOPES = Object.freeze({
  workspace_narrative_conflict_deferred: "full",
  lab_readout_pilot_deferred: "artifact_scope",
  reflection_corpus_provenance_deferred: "mechanism_and_open_corpus_scope",
});
// 4Z reserved set MINUS the three paid, PLUS the one minted:
export const VNC_RESERVED_SLOTS = Object.freeze([
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "cross_gate_residue_benchmark_deferred",
  "submitted_document_pilot_deferred",
  "frontier_readout_conflict_deferred",
]);
