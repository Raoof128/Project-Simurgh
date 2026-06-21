// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildSelfProof } from "../../../../tools/simurgh-temporal/registry.mjs";

test("buildSelfProof: clean baseline passes, all detectors fire, zero laundering", () => {
  const sp = buildSelfProof();
  assert.equal(sp.type, "simurgh.temporal.self_proof_results.v1");
  assert.equal(sp.pollutes_real_registry, false);
  assert.equal(sp.pollutes_real_diffs, false);
  assert.equal(sp.summary.clean_baseline_passed, true);
  assert.equal(sp.summary.all_expected_detectors_fired, true);
  assert.equal(sp.summary.integrity_laundering_successes, 0);
  assert.ok(sp.fixtures.every((f) => f.passed), "all fixtures pass");
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "before-integrity-failure",
    "after-integrity-failure",
    "corpus-mismatch",
    "cross-lineage-diff",
    "tampered-past-entry",
    "removed-entry-append",
    "reordered-entry-append",
    "missing-created-at",
    "invalid-created-at",
  ])
    assert.ok(ids.includes(id), `has ${id}`);
});
