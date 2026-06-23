import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExternalDefenseBundle } from "../../../../tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs";

test("bundle has the 3V-B identity and seven hashes", () => {
  const b = buildExternalDefenseBundle();
  assert.equal(b.type, "simurgh.vca.external_defense_run.v1");
  assert.equal(b.stage, "3V-B");
  assert.equal(b.model_reexecuted_in_ci, false);
  assert.equal(b.capture_mode, "live_capture_frozen_replay");
  assert.equal(Object.keys(b.gateway_computed_hashes).length, 7);
  assert.equal(b.run_set.input_cases, 180);
  assert.ok(b.known_limitations.includes("live_capture_origin_self_reported"));
});
test("bundle is deterministic", () => {
  assert.deepEqual(buildExternalDefenseBundle(), buildExternalDefenseBundle());
});
