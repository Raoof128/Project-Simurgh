import { test } from "node:test";
import assert from "node:assert/strict";
import { runStage3wSelfProof } from "../../../../tests/e2e/llm_shield_stage3w_tamper_runner.mjs";

test("every tamper case rejected, counters zero", () => {
  const r = runStage3wSelfProof();
  assert.equal(r.all_passed, true);
  assert.ok(r.cases.length >= 9);
  assert.equal(r.counters.accepted_tampered_bundles, 0);
  assert.equal(r.counters.raw_field_in_bundle, 0);
});
