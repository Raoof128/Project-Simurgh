// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runExtractionSelfProof } from "../../../../tools/simurgh-extraction/selfProof.mjs";

test("self-proof: all falsification fixtures pass with zero failures", () => {
  const { summary, fixtures } = runExtractionSelfProof();
  assert.equal(summary.all_passed, true);
  assert.equal(summary.benign_escalation_failures, 0);
  assert.equal(summary.single_family_escalations, 0);
  assert.equal(summary.distinct_family_double_count_failures, 0);
  assert.equal(summary.intent_claims_rendered, 0);
  assert.equal(summary.decision_reproduction_failures, 0);
  assert.equal(summary.duplicate_run_id_failures, 0);
  assert.equal(fixtures.length, 11);
  assert.ok(fixtures.every((f) => f.passed));
});
