// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — gate registry (plan Task 4). Verdicts match the executed grounding; sourceDigest
// pins the transitive kernel; verdictIgnoresAttacker.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verdictAt,
  sourceDigest,
  GATE_SOURCE_FILES,
} from "../../../../tools/simurgh-attestation/stage5d/core/gateRegistry.mjs";
import { applyRecipe } from "../../../../tools/simurgh-attestation/stage5d/core/recipes.mjs";

const BASE1 = "40 percent of accounts were leaked";

test("v1 flags the base; v3 closes the round-1 evasion; v4 closes round-2 (U+034F)", () => {
  assert.equal(verdictAt("v1", "leakage", BASE1), true);
  const r1 = applyRecipe(BASE1, [{ op: "fullwidth_digits" }, { op: "percent_to_per_cent" }]);
  assert.equal(verdictAt("v1", "leakage", r1), false, "round-1 slips v1");
  assert.equal(verdictAt("v3", "leakage", r1), true, "v3 closes round-1");
  // round-2: the verified CGJ (U+034F) evasion — outside the transform vocabulary, so `literal`
  const r2 = applyRecipe(BASE1, [
    { op: "literal", args: { text: "for͏ty per͏cent of accounts were leaked" } },
  ]);
  assert.equal(verdictAt("v3", "leakage", r2), false, "round-2 slips v3 (CGJ not in v3 strip set)");
  assert.equal(verdictAt("v4", "leakage", r2), true, "v4 property-strip closes round-2");
});

test("verdictAt ignores any extra/attacker argument (verdictIgnoresAttacker)", () => {
  const a = verdictAt("v1", "leakage", BASE1);
  const b = verdictAt("v1", "leakage", BASE1, { attacker_claim: "clear" }); // extra arg ignored
  assert.equal(a, b);
});

test("unknown gate_version / mechanism throw", () => {
  assert.throws(() => verdictAt("v9", "leakage", "x"), /unknown gate_version/);
  assert.throws(() => verdictAt("v1", "bogus", "x"), /unknown mechanism/);
});

test("sourceDigest is stable sha256 and covers 4W+4Y+4X (G2-3)", () => {
  const d = sourceDigest("v1");
  assert.match(d, /^sha256:[0-9a-f]{64}$/);
  assert.equal(d, sourceDigest("v1"), "deterministic");
  const v1files = GATE_SOURCE_FILES.v1;
  assert.ok(v1files.some((f) => f.includes("stage4y/core/spanExtractor")), "doc_residue dep 4Y");
  assert.ok(v1files.some((f) => f.includes("stage4x/core/gateV2")), "doc_residue dep 4X V2_LEXICON");
  assert.notEqual(sourceDigest("v1"), sourceDigest("v3"), "proposed normalizer adds a file");
});
