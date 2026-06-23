import { test } from "node:test";
import assert from "node:assert/strict";
import { runStage3vbSelfProof } from "../../../../tests/e2e/llm_shield_stage3vb_tamper_runner.mjs";

test("every tamper case is rejected and counters are zero", () => {
  const r = runStage3vbSelfProof();
  assert.equal(r.all_passed, true);
  assert.ok(r.cases.length >= 9);
  assert.equal(r.counters.accepted_tampered_bundles, 0);
  assert.equal(r.counters.raw_output_in_bundle, 0);
});
