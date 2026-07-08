// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — mrRuleset (plan Task 2, F1/P0-1/P0-2). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  MR_TABLE,
  MR_IDS,
  metamorphicTableDigest,
} from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  COMPOSED_MR_TABLE,
  MR_IDS_5C,
  MR_EQUIVALENCE_BASIS_BY_ID,
  applyMR5C,
  composedRulesetDigest,
  fourXSliceMatches,
} from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";
import { VSB_EQUIVALENCE_BASES } from "../../../../tools/simurgh-attestation/stage5c/constants.mjs";

test("P0-2: the 4X slice of the composed table is byte-identical to MR_TABLE", () => {
  const slice = COMPOSED_MR_TABLE.slice(0, MR_TABLE.length);
  assert.equal(canonicalJson(slice), canonicalJson(MR_TABLE));
  assert.ok(fourXSliceMatches());
});

test("composed table appends the 5C families; ids unique", () => {
  assert.equal(COMPOSED_MR_TABLE.length, MR_TABLE.length + 3);
  assert.deepEqual(MR_IDS_5C.slice(0, MR_IDS.length), [...MR_IDS]);
  assert.equal(new Set(MR_IDS_5C).size, MR_IDS_5C.length);
  // 5C objects share the {id, family, pattern} shape (no basis field on objects — P0-2)
  for (const r of COMPOSED_MR_TABLE) {
    assert.deepEqual(Object.keys(r).sort(), ["family", "id", "pattern"]);
  }
});

test("P0-2: equivalence_basis lives in a SEPARATE map covering every id (230 surface)", () => {
  for (const id of MR_IDS_5C) {
    assert.ok(VSB_EQUIVALENCE_BASES.includes(MR_EQUIVALENCE_BASIS_BY_ID[id]), `basis for ${id}`);
  }
});

test("227: composedRulesetDigest is sha256 of canonicalJson(COMPOSED_MR_TABLE)", () => {
  const expected =
    "sha256:" + createHash("sha256").update(canonicalJson(COMPOSED_MR_TABLE)).digest("hex");
  assert.equal(composedRulesetDigest(), expected);
});

test("227: the 4X slice digest still equals 4X's own metamorphicTableDigest()", () => {
  const sliceDigest =
    "sha256:" +
    createHash("sha256")
      .update(canonicalJson({ id: "vlr.metamorphic.v1", relations: [...MR_TABLE] }))
      .digest("hex");
  assert.equal(sliceDigest, metamorphicTableDigest());
});

test("P0-1: applyMR5C(mr_id, base_text) — 4X ids dispatch to imported applyMR, deterministic", () => {
  const base = "all 5000 records were exposed on 5 March";
  for (const id of MR_IDS_5C) {
    const a = applyMR5C(id, base);
    const b = applyMR5C(id, base);
    assert.equal(a, b, `deterministic: ${id}`);
    assert.equal(typeof a, "string");
  }
});

test("the new families actually transform a flagged base (non-degenerate on a fitting input)", () => {
  assert.notEqual(applyMR5C("unicode_confusable", "leaked 5 records"), "leaked 5 records");
  assert.notEqual(
    applyMR5C("voice_flip", "5000 records were exposed"),
    "5000 records were exposed"
  );
  assert.notEqual(applyMR5C("guardrail_evasion", "40 percent of users"), "40 percent of users");
});

test("unknown mr_id throws", () => {
  assert.throws(() => applyMR5C("nope", "x"));
});
