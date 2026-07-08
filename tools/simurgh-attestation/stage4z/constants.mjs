// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA constants (spec §1, §2, §4). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Workspace Attestation: a signed, byte-reproducible evidence contract over
// workspace-readout telemetry from any monitor. No live-model adversary lane, no elicitation.
import { SPAN_TYPES } from "../stage4w/constants.mjs";

export const VWA_DECLARATION_SCHEMA = "simurgh.vwa.declaration.v1";
export const VWA_CAPTURE_SCHEMA = "simurgh.vwa.capture.v1";
export const VWA_MAP_SCHEMA = "simurgh.vwa.map.v1";
export const VWA_AUDIT_SCHEMA = "simurgh.vwa.audit.v1";
export const VWA_ATTESTATION_SCHEMA = "simurgh.vwa.attestation.v1";

// The VSC projection reuses 4W span typing verbatim — single source of truth (spec §3).
export const VWA_SPAN_TYPES = SPAN_TYPES;

// Nano scale: score_nano = roundHalfEven(score * 1e9), serialized as a decimal STRING
// (canonicalJson throws on BigInt / silently rounds Number > 2^53 — plan gauntlet P0).
export const VWA_NANO = 1000000000n;

// The total position rule id (Law 1/2): the grid covers EVERY token position of each
// pinned prompt — a hand-picked list is forbidden, else No Silent Cell is gameable.
export const VWA_POSITION_RULE = "all_positions";

export const VWA_NON_CLAIMS = Object.freeze([
  "not_a_verdict_the_map_is_content_not_judgment",
  "not_faithfulness_the_lens_may_miss_or_misname_cognition",
  "not_deception_detection_never_model_safe",
  "not_a_validation_or_refutation_of_the_papers_numbers",
  "lexicon_restricted_full_vocabulary_j_space_not_reproduced",
  "not_sufficient_for_alignment_monitoring_automatic_circuits_bypass",
  "zero_flags_is_a_valid_outcome_not_evidence_of_safety",
  "precommitment_is_signature_attested_not_temporally_proven",
  "no_tee_or_hardware_attestation_of_the_capture_host",
  "monitor_is_untrusted_advisory_provider_agnostic_in_public_wording",
  "claim_conflict_proves_disagreement_not_which_side_is_true",
]);

export const VWA_KNOWN_LIMITATIONS = Object.freeze([
  "lens_variant_present_token_vjp_lexicon_restricted_rows_only",
  "single_open_1b_model_one_tokenizer_small_benign_corpus",
  "gpu_float_nondeterminism_capture_is_lane_c_digest_only",
  "float32_le_serialization_convention_no_cross_capture_comparability",
  "grid_covers_a_declared_layer_position_subset_not_the_full_model",
  "theta_nano_precommitted_but_operator_chosen_no_optimality_claim",
  "lexicon_token_ids_tokenizer_specific_cross_model_needs_mapping",
  "adapter_contract_untested_against_a_real_lab_export",
  "flag_semantics_threshold_on_restricted_scores_not_the_papers_rank_metric",
]);

export const VWA_RAILS = Object.freeze([
  "no_elicitation_no_honeypots_no_misaligned_organisms",
  "detection_side_lexicon_only",
  "benign_pinned_corpus_only",
  "capture_never_ci_gated",
  "no_evasion_search",
]);

// Socket ledger (spec §1 ADR): 4Z PAYS the three-stage transparency IOU (minted 4W,
// carried 4X/4Y) via the VSC projection, and mints three new debts. The paid slot is
// never left in reserved; the minted slots ARE reserved (a minted socket is an IOU).
export const VWA_PAID_SLOT = "transparency_report_profile_deferred";
export const VWA_MINTED_SLOTS = Object.freeze([
  "workspace_narrative_conflict_deferred",
  "lab_readout_pilot_deferred",
  "reflection_corpus_provenance_deferred",
]);
export const VWA_RESERVED_SLOTS = Object.freeze([
  // 4Y reserved set MINUS the now-paid transparency slot:
  "irreducible_semantic_residue_deferred",
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "cross_gate_residue_benchmark_deferred",
  "submitted_document_pilot_deferred",
  // plus the three minted here:
  ...VWA_MINTED_SLOTS,
]);
