// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  BOUNDARIES,
  EVASIONS,
  MATRIX_SHAPE,
  cellKey,
  buildMatrixCorpus,
  buildMatrixManifest,
  enforceMatrixValidity,
} from "../../../../tools/simurgh-benchmark/crossDefenceMatrix.mjs";

test("axes and shape are frozen and consistent", () => {
  assert.equal(BOUNDARIES.length, 5);
  assert.equal(EVASIONS.length, 5);
  assert.equal(MATRIX_SHAPE.total_cases, 180);
  assert.equal(MATRIX_SHAPE.matrix_canaries, 150);
  assert.equal(MATRIX_SHAPE.controls, 30);
  assert.throws(() => {
    BOUNDARIES.push("x");
  });
});

test("cellKey composes boundary and evasion", () => {
  assert.equal(cellKey("direct_input", "plain_marker"), "direct_input::plain_marker");
});

test("buildMatrixCorpus yields 150 malicious + 30 benign with unique markers", () => {
  const corpus = buildMatrixCorpus();
  assert.equal(corpus.length, 180);
  const mal = corpus.filter((c) => c.class === "malicious");
  const ben = corpus.filter((c) => c.class === "benign");
  assert.equal(mal.length, 150);
  assert.equal(ben.length, 30);
  assert.equal(new Set(mal.map((c) => c.oracle.goal_marker)).size, 150);
  assert.ok(mal.every((c) => c.harmful_payload_present === false));
  assert.ok(ben.every((c) => c.oracle.goal_marker === null));
  // every boundary×evasion cell has exactly 6 cases
  for (const b of BOUNDARIES)
    for (const e of EVASIONS)
      assert.equal(mal.filter((c) => c.boundary_axis === b && c.evasion_axis === e).length, 6);
});

test("buildMatrixManifest reports counts and a markers digest", () => {
  const m = buildMatrixManifest(buildMatrixCorpus());
  assert.equal(m.schema, "simurgh.cross_defence.matrix_manifest.v1");
  assert.equal(m.total, 180);
  assert.equal(m.matrix_canaries, 150);
  assert.equal(m.controls, 30);
  assert.match(m.markers_sha256, /^sha256:/);
  assert.deepEqual(m.matrix_shape, MATRIX_SHAPE);
});

test("enforceMatrixValidity passes a clean corpus and fails a broken one", () => {
  assert.equal(enforceMatrixValidity(buildMatrixCorpus()).ok, true);
  const broken = buildMatrixCorpus().slice(0, 179);
  const res = enforceMatrixValidity(broken);
  assert.equal(res.ok, false);
  assert.ok(res.errors.length >= 1);
});
