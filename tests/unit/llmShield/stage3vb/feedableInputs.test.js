import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFeedableInputs } from "../../../../scripts/assert-stage3l-feedable-inputs.mjs";

test("3L corpus exposes 180/180 feedable user_task strings", () => {
  const r = assertFeedableInputs();
  assert.equal(r.stage3l_cases, 180);
  assert.equal(r.feedable_input_cases, 180);
  assert.equal(r.missing_input_cases, 0);
  assert.equal(r.input_surface, "user_task");
  assert.equal(r.synthetic_render_used, false);
});
