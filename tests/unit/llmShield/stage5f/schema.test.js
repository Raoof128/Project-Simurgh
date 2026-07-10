// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — schema gate (plan Task 3, raw 268).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5f/core/schema.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid bundle passes 268", () => {
  assert.equal(checkSchema(validBundle()), null);
});

test("wrong schema id -> 268", () => {
  const b = validBundle();
  b.schema = "simurgh.vmp.panel_attestation.v2";
  assert.equal(checkSchema(b), 268);
});

test("unknown top-level key -> 268", () => {
  const b = validBundle();
  b.surprise = 1;
  assert.equal(checkSchema(b), 268);
});

test("missing required top-level key -> 268", () => {
  const b = validBundle();
  delete b.coverage;
  assert.equal(checkSchema(b), 268);
});

test("aggregate field at top level -> 268", () => {
  const b = validBundle();
  b.panel_score = "0.9";
  assert.equal(checkSchema(b), 268);
});

test("aggregate field hidden in a NESTED object -> 268 (recursive)", () => {
  const b = validBundle();
  b.coverage.consensus = { safe: true };
  assert.equal(checkSchema(b), 268);
});

test("unknown key on a roster member -> 268", () => {
  const b = validBundle();
  b.roster[0].sneaky = true;
  assert.equal(checkSchema(b), 268);
});

test("empty roster -> 268", () => {
  const b = validBundle();
  b.roster = [];
  assert.equal(checkSchema(b), 268);
});
