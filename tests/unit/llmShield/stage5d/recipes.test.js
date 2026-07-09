// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — recipe engine (plan Task 3). Determinism, op semantics, reproduces real evasions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRecipe, evasionDigest, recipeDigest } from "../../../../tools/simurgh-attestation/stage5d/core/recipes.mjs";
import { scanLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";

const clear = (t) => scanLeakage(t, [], []).length === 0;
const BASE1 = "40 percent of accounts were leaked";

test("round-1 recipe reproduces the fullwidth+per-cent evasion and it SLIPS the frozen gate", () => {
  const recipe = [{ op: "fullwidth_digits" }, { op: "percent_to_per_cent" }];
  const out = applyRecipe(BASE1, recipe);
  assert.equal(out, "４０ per cent of accounts were leaked");
  assert.ok(!clear(BASE1), "base is flagged");
  assert.ok(clear(out), "evasion evades the frozen gate (slip)");
});

test("combining_joiner inserts CGJ at codepoint indices (descending-safe)", () => {
  // "forty" -> "for͏ty": CGJ after index 2 (r)
  const out = applyRecipe("forty", [{ op: "combining_joiner", args: { positions: [2] } }]);
  assert.equal([...out].length, 6);
  assert.equal([...out][3], "͏");
});

test("cross_script_confusable replaces the codepoint at an index", () => {
  // replace the 't' (index 3) of "forty" with Cyrillic small te
  const out = applyRecipe("forty", [
    { op: "cross_script_confusable", args: { replacements: [{ index: 3, to: "т" }] } },
  ]);
  assert.equal(out, "forтy");
});

test("spell_number + homoglyph_month use sorted-key substring maps (deterministic)", () => {
  assert.equal(applyRecipe("40", [{ op: "spell_number", args: { map: { 40: "forty" } } }]), "forty");
  assert.equal(
    applyRecipe("March", [{ op: "homoglyph_month", args: { map: { March: "Mаrch" } } }]),
    "Mаrch"
  );
});

test("literal op returns verbatim text (G2-2 catch-all)", () => {
  assert.equal(applyRecipe("ignored", [{ op: "literal", args: { text: "any bytes 𝟜𝟘" } }]), "any bytes 𝟜𝟘");
});

test("unknown op throws (→244/254)", () => {
  assert.throws(() => applyRecipe("x", [{ op: "not_a_real_op" }]), /unknown recipe op/);
});

test("applyRecipe is pure/deterministic; digests stable", () => {
  const r = [{ op: "fullwidth_digits" }, { op: "percent_to_per_cent" }];
  assert.equal(applyRecipe(BASE1, r), applyRecipe(BASE1, r));
  assert.equal(evasionDigest(BASE1, r), evasionDigest(BASE1, r));
  assert.equal(recipeDigest(r), recipeDigest(r));
  assert.match(evasionDigest(BASE1, r), /^sha256:[0-9a-f]{64}$/);
});
