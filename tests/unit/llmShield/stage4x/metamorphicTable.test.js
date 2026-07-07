// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR metamorphic table (plan Task 4) — residue is a pure function of the seed.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MR_TABLE,
  MR_IDS,
  applyMR,
  metamorphicTableDigest,
} from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";
import { checkLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import { checkLeakageV2 } from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";
import { VLR_FAMILIES } from "../../../../tools/simurgh-attestation/stage4x/constants.mjs";

// Canonical fixtures: (mrId, seed) → expected residue. Every seed is v1-caught; every
// non-floor residue slips v1 and is caught by v2; the floor residue slips both.
const FIX = [
  [
    "digit_to_word_quantifier",
    "23% of the base was affected",
    "roughly a quarter of the base was affected",
  ],
  [
    "exact_to_hedged",
    "all 4200 accounts were notified",
    "essentially the whole set of accounts were notified",
  ],
  ["percent_to_fraction_phrase", "80% of sessions failed", "a large fraction of sessions failed"],
  ["date_to_relative", "on 3 August the outage began", "around that time the outage began"],
  ["count_to_bulk_phrase", "137 incidents were logged", "a handful of incidents were logged"],
  ["true_semantic_paraphrase", "90 percent of customers were harmed", "customers were harmed"],
];

test("MR ids are exactly the six families", () => {
  assert.deepEqual([...MR_IDS], [...VLR_FAMILIES]);
  assert.equal(MR_TABLE.length, 6);
});

test("applyMR is deterministic and pure", () => {
  for (const [id, seed] of FIX) assert.equal(applyMR(id, seed), applyMR(id, seed));
});

test("applyMR produces the expected residue byte-for-byte", () => {
  for (const [id, seed, expected] of FIX) assert.equal(applyMR(id, seed), expected, id);
});

test("round-trip: v1 catches every seed", () => {
  for (const [, seed] of FIX)
    assert.ok(checkLeakage(seed, [], []), `v1 should catch seed: ${seed}`);
});

test("round-trip: residue slips v1; v2 catches all but the floor", () => {
  for (const [id, seed] of FIX) {
    const residue = applyMR(id, seed);
    assert.equal(checkLeakage(residue, [], []), null, `residue must slip v1: ${residue}`);
    if (id === "true_semantic_paraphrase")
      assert.equal(checkLeakageV2(residue, [], []), null, `floor slips v2 too: ${residue}`);
    else assert.ok(checkLeakageV2(residue, [], []), `v2 should catch: ${residue}`);
  }
});

test("applyMR throws on unknown id", () => {
  assert.throws(() => applyMR("no_such_mr", "x"), /unknown metamorphic_relation/);
});

test("metamorphicTableDigest is stable", () => {
  assert.equal(metamorphicTableDigest(), metamorphicTableDigest());
  assert.match(metamorphicTableDigest(), /^sha256:[0-9a-f]{64}$/);
});
