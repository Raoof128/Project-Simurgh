// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — frozen constants (plan Task 1). Motto: AnthropicSafe First, then ReviewerSafe.
// Verifiable Adaptive Red-Team Ledger: a multi-round attack↔harden escalation ledger over the
// FROZEN 5C leakage/doc_residue gate, produced by a key-free two-role ceremony (attacker subagent +
// watcher verifier). Every value here is exact and Object.freeze'd (audit P0-3).

export const VARL_SCHEMAS = Object.freeze({
  LEDGER: "simurgh.varl.escalation_ledger.v1",
  AUDIT_PRIVATE: "simurgh.varl.audit_private.v1",
  BYO_TARGET: "simurgh.varl.byo_target.v1",
  ATTESTER_PROVENANCE: "simurgh.varl.attester_provenance.v1",
});

// Closed set of recipe op-KINDS (params allowed; see core/recipes.mjs). `literal` (G2-2) stores a
// verbatim evasion string so a Lane C evasion outside the transform vocabulary is still reproducible.
export const VARL_RECIPE_OPS = Object.freeze([
  "fullwidth_digits",
  "percent_to_per_cent",
  "combining_joiner",
  "cross_script_confusable",
  "spell_number",
  "homoglyph_month",
  "literal",
]);

export const VARL_GATE_KINDS = Object.freeze(["frozen_kernel", "proposed_normalizer"]);
export const VARL_DURABILITY = Object.freeze(["durable", "brittle"]);
export const VARL_TRILEMMA_CORNERS = Object.freeze([
  "ascii_allowlist",
  "cross_script",
  "uts39_skeleton",
]);
export const VARL_TRILEMMA_AXES = Object.freeze([
  "closes_confusables",
  "diacritic_overblock",
  "fixed",
]);

// Anti-overclaim denylist (252): screens analyst_note free text. Exact tokens, no "…".
export const VARL_OVERCLAIM_DENYLIST = Object.freeze([
  "cure",
  "cured",
  "solved",
  "unbreakable",
  "immune",
  "bulletproof",
  "foolproof",
  "impenetrable",
  "100% safe",
  "cannot be bypassed",
]);

// Socket ledger (spec §5). PAYS two 5C slots; MINTS two; carries the 5C remainder as RESERVED.
export const VARL_PAID_SLOTS = Object.freeze([
  "learned_paraphrase_mutation_deferred",
  "live_adversary_capture_lane_deferred",
]);
export const VARL_PAID_SCOPE = Object.freeze({
  learned_paraphrase_mutation_deferred: "adaptive_live_execution",
  live_adversary_capture_lane_deferred: "agent_team_route|pinned_api_attacker",
});
export const VARL_MINTED_SLOTS = Object.freeze([
  "unicode_confusables_kernel_hardening_deferred",
  "real_deployed_detector_target_deferred",
]);
// The unpaid 5C remainder, carried forward verbatim.
export const VARL_RESERVED_SLOTS = Object.freeze([
  "multilingual_ruleset_deferred",
  "narrative_version_diff_deferred",
  "submitted_document_pilot_deferred",
  "frontier_readout_conflict_deferred",
]);
