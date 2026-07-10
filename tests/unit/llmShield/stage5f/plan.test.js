// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPlan } from "../../../../tools/simurgh-attestation/stage5f/core/plan.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid plan -> null", () => {
  assert.equal(checkPlan(validBundle()), null);
});
test("roster member not in universe (roster ⊄ universe) -> 271", () => {
  const b = validBundle();
  b.detector_universe.candidates = ["some_third_detector", "llama_guard_4_12b"]; // drops PG2
  assert.equal(checkPlan(b), 271);
});
test("universe_digest not matching candidates -> 271", () => {
  const b = validBundle();
  b.detector_universe.universe_digest = "sha256:wrong";
  assert.equal(checkPlan(b), 271);
});
test("panel_plan_digest mismatch -> 271", () => {
  const b = validBundle();
  b.roster_precommit.panel_plan_digest = "sha256:wrong";
  assert.equal(checkPlan(b), 271);
});
test("duplicate member_id -> 271", () => {
  const b = validBundle();
  b.roster[1].member_id = "prompt_guard_2_86m";
  assert.equal(checkPlan(b), 271);
});
