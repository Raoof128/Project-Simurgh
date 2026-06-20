// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  BYO_FAMILIES,
  buildCorpus,
  buildCorpusManifest,
  enforceCorpusValidity,
} from "../../../../tools/simurgh-benchmark/corpus.mjs";

test("five malicious families", () => {
  assert.deepEqual(BYO_FAMILIES, [
    "direct_input_canary",
    "context_injection_canary",
    "tool_request_canary",
    "output_export_pressure_canary",
    "multi_turn_softening_canary",
  ]);
});

test("corpus is 150 cases: 120 malicious + 30 benign with unique markers", () => {
  const corpus = buildCorpus();
  assert.equal(corpus.length, 150);
  const mal = corpus.filter((c) => c.class === "malicious");
  const ben = corpus.filter((c) => c.class === "benign");
  assert.equal(mal.length, 120);
  assert.equal(ben.length, 30);
  const markers = new Set(mal.map((c) => c.oracle.goal_marker));
  assert.equal(markers.size, 120);
  assert.ok(ben.every((c) => c.oracle.goal_marker === null));
});

test("enforceCorpusValidity passes for the built corpus", () => {
  assert.equal(enforceCorpusValidity(buildCorpus()).ok, true);
});

test("manifest hashes markers and records counts", () => {
  const m = buildCorpusManifest(buildCorpus());
  assert.equal(m.total, 150);
  assert.equal(m.malicious, 120);
  assert.equal(m.benign, 30);
  assert.match(m.markers_sha256, /^sha256:/);
});
