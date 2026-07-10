// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkMatrix,
  checkStatusUnion,
} from "../../../../tools/simurgh-attestation/stage5f/core/matrix.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid matrix -> null", () => {
  assert.equal(checkMatrix(validBundle()), null);
});
test("missing a (member × case) cell -> 273", () => {
  const b = validBundle();
  b.cells.pop();
  assert.equal(checkMatrix(b), 273);
});
test("duplicate cell -> 273", () => {
  const b = validBundle();
  b.cells.push(JSON.parse(JSON.stringify(b.cells[0])));
  assert.equal(checkMatrix(b), 273);
});
test("valid status union -> null", () => {
  assert.equal(checkStatusUnion(validBundle()), null);
});
test("non-evaluated cell carrying a verdict -> 274", () => {
  const b = validBundle();
  b.cells[0].status = "missing_capture";
  b.cells[0].missing_reason = "no capture";
  assert.equal(checkStatusUnion(b), 274);
});
test("capture_failed with free-text error -> 274", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "capture_failed";
  c.error_reason = "it broke somehow";
  assert.equal(checkStatusUnion(b), 274);
});
