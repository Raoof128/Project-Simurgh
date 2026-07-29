// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the permanent regression gate for finding 5S-F004.
//
// Regenerated files are a photograph of a working camera. This is the camera: exact set equality
// between the shared ledger source and BOTH committed projections, on every run, with a seeded
// omission proving the gate goes red.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RUN_LEVEL_BY_RAW } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  PROJECTION_REFUSALS as R,
  compareProjection,
} from "../../../../tools/simurgh-attestation/stage5s/core/ledgerProjection.mjs";

const PROJECTIONS = [
  "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
  "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
];
const load = (p) => JSON.parse(readFileSync(p, "utf8")).run_level_by_raw;

for (const path of PROJECTIONS) {
  test(`[5s-t5g] the ledger source equals the projection: ${path.split("/")[0]}`, () => {
    const v = compareProjection(RUN_LEVEL_BY_RAW, load(path));
    assert.deepEqual(v.removed, [], `codes in the ledger but MISSING from ${path}: ${v.removed}`);
    assert.deepEqual(v.added, [], `codes in ${path} but not in the ledger: ${v.added}`);
    assert.deepEqual(v.changed, [], `run levels disagree: ${JSON.stringify(v.changed)}`);
    assert.equal(v.ok, true);
  });
}

test("[5s-t5g] both projections carry the Stage 5S band and 5P's restored codes", () => {
  for (const path of PROJECTIONS) {
    const m = load(path);
    for (const c of [464, 474, 475, 511, 512]) {
      assert.ok(Object.hasOwn(m, String(c)), `${path} is missing ${c}`);
    }
    assert.equal(m["512"], 3, "the fail-closed wrapper must not claim run level 1");
  }
});

test("[5s-t5g] SEEDED OMISSION: dropping one code turns the gate RED", () => {
  // Without this the gate is a photograph of a working camera.
  const projection = { ...load(PROJECTIONS[0]) };
  delete projection["475"];
  const v = compareProjection(RUN_LEVEL_BY_RAW, projection);
  assert.equal(v.ok, false);
  assert.equal(v.refusal, R.MISSING_FROM_PROJECTION);
  assert.deepEqual(v.removed, [475]);
});

test("[5s-t5g] SEEDED DRIFT: a changed run level turns the gate RED, though counts agree", () => {
  const projection = { ...load(PROJECTIONS[0]), 475: 2 };
  const v = compareProjection(RUN_LEVEL_BY_RAW, projection);
  assert.equal(v.ok, false);
  assert.equal(v.refusal, R.MAPPING_CHANGED);
  assert.deepEqual(v.changed, [{ code: 475, source: 1, projection: 2 }]);
});

test("[5s-t5g] SEEDED EXTRA: a code the ledger does not know turns the gate RED", () => {
  const v = compareProjection(RUN_LEVEL_BY_RAW, { ...load(PROJECTIONS[0]), 9998: 1 });
  assert.equal(v.ok, false);
  assert.equal(v.refusal, R.EXTRA_IN_PROJECTION);
  assert.deepEqual(v.added, [9998]);
});

test("[5s-t5g] an empty side is a REFUSAL, never a trivially satisfied comparison", () => {
  assert.equal(compareProjection(RUN_LEVEL_BY_RAW, {}).refusal, R.EMPTY_INPUT);
  assert.equal(compareProjection({}, load(PROJECTIONS[0])).refusal, R.EMPTY_INPUT);
});

test("[5s-t5g] the historical drift this gate exists for would have been caught", () => {
  // The exact pre-repair state: the projection stopping at 463 while the ledger ran to 474.
  const truncated = Object.fromEntries(
    Object.entries(load(PROJECTIONS[0])).filter(([c]) => Number(c) <= 463)
  );
  const v = compareProjection(RUN_LEVEL_BY_RAW, truncated);
  assert.equal(v.ok, false);
  assert.ok(v.removed.includes(464) && v.removed.includes(474));
  assert.ok(v.removed.length >= 11 + 38, "the gate must see both the 5P gap and the 5S band");
});
