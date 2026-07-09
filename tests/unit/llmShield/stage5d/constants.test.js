// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — constants (plan Task 1). Asserts exact frozen literals (audit P0-3).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VARL_SCHEMAS,
  VARL_RECIPE_OPS,
  VARL_GATE_KINDS,
  VARL_DURABILITY,
  VARL_TRILEMMA_CORNERS,
  VARL_TRILEMMA_AXES,
  VARL_OVERCLAIM_DENYLIST,
  VARL_PAID_SLOTS,
  VARL_PAID_SCOPE,
  VARL_MINTED_SLOTS,
  VARL_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5d/constants.mjs";

test("schemas are exact and frozen", () => {
  assert.equal(VARL_SCHEMAS.LEDGER, "simurgh.varl.escalation_ledger.v1");
  assert.equal(VARL_SCHEMAS.AUDIT_PRIVATE, "simurgh.varl.audit_private.v1");
  assert.equal(VARL_SCHEMAS.BYO_TARGET, "simurgh.varl.byo_target.v1");
  assert.equal(VARL_SCHEMAS.ATTESTER_PROVENANCE, "simurgh.varl.attester_provenance.v1");
  assert.ok(Object.isFrozen(VARL_SCHEMAS));
});

test("recipe op-set is the closed vocabulary incl. literal", () => {
  assert.deepEqual(VARL_RECIPE_OPS, [
    "fullwidth_digits",
    "percent_to_per_cent",
    "combining_joiner",
    "cross_script_confusable",
    "spell_number",
    "homoglyph_month",
    "literal",
  ]);
  assert.ok(Object.isFrozen(VARL_RECIPE_OPS));
});

test("enum arrays are exact and frozen", () => {
  assert.deepEqual(VARL_GATE_KINDS, ["frozen_kernel", "proposed_normalizer"]);
  assert.deepEqual(VARL_DURABILITY, ["durable", "brittle"]);
  assert.deepEqual(VARL_TRILEMMA_CORNERS, ["ascii_allowlist", "cross_script", "uts39_skeleton"]);
  assert.deepEqual(VARL_TRILEMMA_AXES, ["closes_confusables", "diacritic_overblock", "fixed"]);
  for (const a of [VARL_GATE_KINDS, VARL_DURABILITY, VARL_TRILEMMA_CORNERS, VARL_TRILEMMA_AXES])
    assert.ok(Object.isFrozen(a));
});

test("overclaim denylist is exact", () => {
  assert.ok(VARL_OVERCLAIM_DENYLIST.includes("unbreakable"));
  assert.ok(VARL_OVERCLAIM_DENYLIST.includes("cannot be bypassed"));
  assert.equal(VARL_OVERCLAIM_DENYLIST.length, 10);
});

test("socket ledger: pays 2, mints 2, reserves the 5C remainder (no overlap)", () => {
  assert.deepEqual(VARL_PAID_SLOTS, [
    "learned_paraphrase_mutation_deferred",
    "live_adversary_capture_lane_deferred",
  ]);
  assert.equal(VARL_PAID_SCOPE.learned_paraphrase_mutation_deferred, "adaptive_live_execution");
  assert.deepEqual(VARL_MINTED_SLOTS, [
    "unicode_confusables_kernel_hardening_deferred",
    "real_deployed_detector_target_deferred",
  ]);
  assert.deepEqual(VARL_RESERVED_SLOTS, [
    "multilingual_ruleset_deferred",
    "narrative_version_diff_deferred",
    "submitted_document_pilot_deferred",
    "frontier_readout_conflict_deferred",
  ]);
  // a paid slot is never also reserved
  for (const s of VARL_PAID_SLOTS) assert.ok(!VARL_RESERVED_SLOTS.includes(s));
});
