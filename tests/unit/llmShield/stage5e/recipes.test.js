// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — recipe engine (plan Task 3). Pure, deterministic, closed op-set.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyRecipe,
  generatedTextDigest,
  recipeDigest,
} from "../../../../tools/simurgh-attestation/stage5e/core/recipes.mjs";

test("fullwidth_digits + percent_to_per_cent reproduce a canonical evasion", () => {
  const out = applyRecipe("40 percent", [
    { op: "fullwidth_digits" },
    { op: "percent_to_per_cent" },
  ]);
  assert.equal(out, "４０ per cent");
});

test("combining_joiner inserts the invisible CGJ at a codepoint index", () => {
  const out = applyRecipe("abcd", [{ op: "combining_joiner", args: { positions: [1] } }]);
  assert.equal([...out].length, 5); // one codepoint inserted
  assert.equal([...out][2], "͏");
});

test("literal carries a verbatim variant string", () => {
  assert.equal(applyRecipe("x", [{ op: "literal", args: { text: "т ⲉ һ" } }]), "т ⲉ һ");
});

test("recipeDeterminism: same (base, recipe) -> identical bytes", () => {
  const r = [{ op: "fullwidth_digits" }];
  assert.equal(applyRecipe("2026", r), applyRecipe("2026", r));
  assert.equal(generatedTextDigest("2026", r), generatedTextDigest("2026", r));
});

test("unknown op throws (surfaces as 258 / 267)", () => {
  assert.throws(() => applyRecipe("x", [{ op: "not_an_op" }]), /unknown recipe op/);
});

test("combining_joiner index out of range throws", () => {
  assert.throws(
    () => applyRecipe("ab", [{ op: "combining_joiner", args: { positions: [9] } }]),
    /out of range/
  );
});

test("generatedTextDigest keys the variant; distinct recipes -> distinct digests", () => {
  const d1 = generatedTextDigest("40 percent", [{ op: "fullwidth_digits" }]);
  const d2 = generatedTextDigest("40 percent", [{ op: "percent_to_per_cent" }]);
  assert.notEqual(d1, d2);
  assert.match(d1, /^sha256:[0-9a-f]{64}$/);
  assert.match(recipeDigest([{ op: "fullwidth_digits" }]), /^sha256:[0-9a-f]{64}$/);
});
