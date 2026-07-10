// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAdapter } from "../../../../tools/simurgh-attestation/stage5f/core/adapter.mjs";
import { validBundle, fixture } from "./_validBundle.mjs";

test("valid adapter binding -> null", () => {
  assert.equal(checkAdapter(validBundle(), fixture.replayResults), null);
});
test("detector_input_digest disagrees with replay -> 276", () => {
  const b = validBundle();
  b.cells[0].detector_input_digest = "sha256:tamper";
  assert.equal(checkAdapter(b, fixture.replayResults), 276);
});
test("cell adapter_digest not matching roster member -> 276", () => {
  const b = validBundle();
  b.cells[0].adapter_digest = "sha256:wrong";
  assert.equal(checkAdapter(b, fixture.replayResults), 276);
});
test("missing replay result -> 282 (env, not tampering)", () => {
  assert.equal(checkAdapter(validBundle(), {}), 282);
});
test("capture_failed cell also requires input binding", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "capture_failed";
  c.error_reason = "runtime_error";
  c.detector_input_digest = "sha256:mismatch";
  assert.equal(checkAdapter(b, fixture.replayResults), 276);
});
