// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCensus } from "../../../../tools/simurgh-attestation/stage5f/core/census.mjs";
import { validBundle, fixture } from "./_validBundle.mjs";

test("valid census bijection -> null", () => {
  assert.equal(checkCensus(validBundle(), fixture.auditPrivate), null);
});
test("census digest mismatch -> 280", () => {
  const b = validBundle();
  b.capture_provenance.capture_log_digest = "sha256:wrong";
  assert.equal(checkCensus(b, fixture.auditPrivate), 280);
});
test("dropped census record -> 280", () => {
  const ap = JSON.parse(JSON.stringify(fixture.auditPrivate));
  ap.records.pop();
  assert.equal(checkCensus(validBundle(), ap), 280);
});
