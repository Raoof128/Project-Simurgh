import { test } from "node:test";
import assert from "node:assert/strict";
import { assertCommittedCaptureIntegrity } from "../../../../scripts/assert-stage3vb-capture-integrity.mjs";

test("committed replay artifact passes capture integrity", () => {
  const r = assertCommittedCaptureIntegrity();
  assert.equal(r.raw_capture_cases, 180);
  assert.equal(r.matches_stage3l_case_ids, true);
  assert.equal(r.raw_prompts_exported, false);
});
