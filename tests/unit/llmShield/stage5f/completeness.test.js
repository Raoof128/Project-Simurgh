// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkCompleteness,
  evaluatePolicy,
} from "../../../../tools/simurgh-attestation/stage5f/core/completeness.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid completeness+coverage -> null", () => {
  assert.equal(checkCompleteness(validBundle()), null);
});
test("declared evaluation_complete=true while a missing_capture exists -> 279", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "missing_capture";
  c.missing_reason = "no capture";
  // declared completeness still claims complete + old histogram -> mismatch
  assert.equal(checkCompleteness(b), 279);
});
test("understated omission_lower_bound -> 279", () => {
  const b = validBundle();
  b.coverage.omission_lower_bound = 0; // real = 3-2 = 1
  assert.equal(checkCompleteness(b), 279);
});
test("tampered heterogeneous_label_vector -> 279", () => {
  const b = validBundle();
  b.coverage.heterogeneous_label_vector[0].labels.prompt_guard_2_86m.label = "benign";
  assert.equal(checkCompleteness(b), 279);
});
test("policy: complete panel accepted, incomplete rejected (281)", () => {
  assert.equal(evaluatePolicy(validBundle()), null);
  const b = validBundle();
  b.completeness.evaluation_complete = false;
  assert.equal(evaluatePolicy(b), 281);
});
