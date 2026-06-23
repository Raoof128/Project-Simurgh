import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStage3lCorpus } from "../../../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import { assertCaptureIntegrity } from "../../../../tools/external-defense-adapters/llamaGuard4Adapter.mjs";
import { buildSampleCapture } from "../../../../tools/external-defense-adapters/sampleLlamaGuard4Capture.mjs";

test("sample capture covers 180 cases and passes integrity", () => {
  const cap = buildSampleCapture();
  assert.equal(cap.schema, "simurgh.stage3vb.frozen_lg4_capture.v1");
  assert.equal(cap.live, false);
  assert.equal(cap.cases.length, 180);
  assert.doesNotThrow(() => assertCaptureIntegrity(cap, buildStage3lCorpus()));
});
test("sample capture is deterministic and sorted", () => {
  const a = buildSampleCapture();
  const b = buildSampleCapture();
  assert.deepEqual(a, b);
  const ids = a.cases.map((c) => c.case_id);
  assert.deepEqual(ids, [...ids].sort());
});
test("sample capture exports no raw prompts", () => {
  assert.equal(buildSampleCapture().contains_raw_prompts, false);
});
