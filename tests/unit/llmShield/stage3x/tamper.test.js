import { test } from "node:test";
import assert from "node:assert/strict";
import { runStage3xSelfProof } from "../../../../tests/e2e/llm_shield_stage3x_tamper_runner.mjs";

test("every tamper case rejected, counters zero", () => {
  const r = runStage3xSelfProof();
  assert.equal(r.all_passed, true);
  assert.ok(r.cases.length >= 9);
  assert.equal(r.counters.accepted_tampered_bundles, 0);
  assert.equal(r.counters.eh_unsafe_accepted, 0);
});
