// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAlignmentMap,
  checkAlignmentMap,
  HONESTY_CEILING,
} from "../../../../tools/simurgh-attestation/stage4o/core/constitutionCore.mjs";

test("built alignment map passes the claim compiler", () => {
  const map = buildAlignmentMap();
  assert.equal(map.length, 12);
  assert.deepEqual(checkAlignmentMap(map), { ok: true });
  assert.equal(map[0].raw_code, 55);
  assert.equal(map.at(-1).raw_code, 66);
  for (const e of map) assert.equal(e.non_claim, "not_a_model_value_guarantee");
});

test("claim compiler rejects out-of-vocabulary claim, wrong mechanism, and wrong count", () => {
  const map = buildAlignmentMap();
  const badVocab = map.map((e, i) =>
    i === 0 ? { ...e, alignment_claim: "we_make_the_model_safe" } : e
  );
  assert.equal(checkAlignmentMap(badVocab).ok, false);
  const badMech = map.map((e, i) => (i === 0 ? { ...e, mechanism: "totally_wrong" } : e));
  assert.equal(checkAlignmentMap(badMech).ok, false);
  assert.equal(checkAlignmentMap(map.slice(0, 11)).ok, false);
});

test("honesty ceiling is present verbatim and does not claim compliance", () => {
  assert.ok(HONESTY_CEILING.includes("Infrastructure alignment is not model-value alignment."));
  assert.ok(HONESTY_CEILING.includes("does not claim constitutional compliance"));
});
