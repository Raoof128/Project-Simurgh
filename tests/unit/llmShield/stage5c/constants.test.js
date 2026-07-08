// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — constants (plan Task 1). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSB_SCHEMAS,
  VSB_DOMAINS,
  VSB_MECHANISMS,
  VSB_LEAKAGE_VERSIONS,
  VSB_MECHANISM_VERSIONS,
  VSB_MR_FAMILIES_ADDED,
  VSB_EQUIVALENCE_BASES,
  VSB_SEVERITY_ENUM,
  VSB_SEVERITY_BASES,
  VSB_BREACH_CLAIM_DENYLIST,
  VSB_CELL_CLASSES,
  VSB_MAX_DEGENERATE_RATE,
  VSB_LANE_C_KINDS,
  VSB_NON_CLAIMS,
  VSB_KNOWN_LIMITATIONS,
  VSB_RAILS,
  VSB_PAID_SLOTS,
  VSB_PAID_SLOT_SCOPES,
  VSB_MINTED_SLOTS,
  VSB_RESERVED_SLOTS,
  CAMPAIGN_LABEL,
} from "../../../../tools/simurgh-attestation/stage5c/constants.mjs";

test("schemas: all four artifact schemas present (P1-103)", () => {
  assert.equal(VSB_SCHEMAS.SLIP_LEDGER, "simurgh.vsb.slip_ledger.v1");
  assert.equal(VSB_SCHEMAS.ATTESTATION, "simurgh.vsb.attestation.v1");
  assert.equal(VSB_SCHEMAS.LANEB_SEVERITY, "simurgh.vsb.laneb_severity.v1");
  assert.equal(VSB_SCHEMAS.LANEC_VERDICT_LOG, "simurgh.vsb.lanec_verdict_log.v1");
  assert.equal(Object.keys(VSB_DOMAINS).length, 4);
});

test("mechanisms: two CI mechanisms, not three gates (PF3)", () => {
  assert.deepEqual(VSB_MECHANISMS, ["leakage", "doc_residue"]);
  assert.deepEqual(VSB_LEAKAGE_VERSIONS, ["v1", "v2"]);
  assert.deepEqual(VSB_MECHANISM_VERSIONS, { leakage: ["v1", "v2"], doc_residue: ["v1"] });
});

test("mr families added, equivalence bases enumerated exactly (P1-108)", () => {
  assert.deepEqual(VSB_MR_FAMILIES_ADDED, [
    "voice_flip",
    "unicode_confusable",
    "guardrail_evasion",
  ]);
  assert.deepEqual(VSB_EQUIVALENCE_BASES, [
    "lexical_synonym",
    "syntactic_voice",
    "structural_reorder",
    "unicode_confusable",
    "whitespace_evasion",
  ]);
});

test("severity enum + blind basis; denylist is non-empty frozen tokens (P0-6)", () => {
  assert.deepEqual(VSB_SEVERITY_ENUM, ["informational", "low", "moderate", "high"]);
  assert.ok(VSB_SEVERITY_BASES.includes("blind_digest_only_review"));
  assert.ok(VSB_BREACH_CLAIM_DENYLIST.length >= 3);
  assert.ok(VSB_BREACH_CLAIM_DENYLIST.every((t) => t === t.toLowerCase()));
});

test("cell classes + degenerate-rate shape (P1-111)", () => {
  assert.deepEqual(VSB_CELL_CLASSES, ["caught", "slipped", "not_applicable", "degenerate"]);
  const { num, den } = VSB_MAX_DEGENERATE_RATE;
  assert.ok(Number.isInteger(num) && Number.isInteger(den));
  assert.ok(den > 0 && num >= 0 && num <= den);
});

test("Lane C implements only external_detector (P0-4)", () => {
  assert.deepEqual(VSB_LANE_C_KINDS, ["external_detector"]);
});

test("honesty ledger frozen and non-empty", () => {
  for (const arr of [VSB_NON_CLAIMS, VSB_KNOWN_LIMITATIONS, VSB_RAILS]) {
    assert.ok(Array.isArray(arr) && arr.length > 0);
    assert.ok(Object.isFrozen(arr));
  }
  // The load-bearing honesty non-claims must be present verbatim.
  assert.ok(VSB_NON_CLAIMS.some((c) => c.includes("detector_bound_not_a_kernel_breach")));
  assert.ok(VSB_NON_CLAIMS.some((c) => c.includes("audit_gap")));
  assert.ok(VSB_KNOWN_LIMITATIONS.some((c) => c.includes("stage4x")));
});

test("socket ledger: pays 4X's irreducible-residue at itemize scope, mints learned-paraphrase (F2)", () => {
  assert.deepEqual(VSB_PAID_SLOTS, ["irreducible_semantic_residue_deferred"]);
  assert.equal(
    VSB_PAID_SLOT_SCOPES.irreducible_semantic_residue_deferred,
    "itemize_and_externalize"
  );
  assert.notEqual(VSB_PAID_SLOT_SCOPES.irreducible_semantic_residue_deferred, "full");
  assert.deepEqual(VSB_MINTED_SLOTS, ["learned_paraphrase_mutation_deferred"]);
});

test("reserved slots: exactly 6, no dupes, excludes paid, includes minted (P1-115)", () => {
  assert.equal(VSB_RESERVED_SLOTS.length, 6);
  assert.equal(new Set(VSB_RESERVED_SLOTS).size, 6);
  assert.ok(!VSB_RESERVED_SLOTS.includes("irreducible_semantic_residue_deferred"));
  assert.ok(VSB_RESERVED_SLOTS.includes("learned_paraphrase_mutation_deferred"));
  assert.deepEqual(VSB_RESERVED_SLOTS, [
    "multilingual_ruleset_deferred",
    "narrative_version_diff_deferred",
    "submitted_document_pilot_deferred",
    "frontier_readout_conflict_deferred",
    "live_adversary_capture_lane_deferred",
    "learned_paraphrase_mutation_deferred",
  ]);
});

test("campaign label is a label, not a per-cell seed", () => {
  assert.equal(CAMPAIGN_LABEL, "stage5c-vsb-v1");
});
