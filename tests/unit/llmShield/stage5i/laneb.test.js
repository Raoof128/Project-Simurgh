import { test } from "node:test";
import assert from "node:assert/strict";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5i/laneb/run-laneb-panel-ceremony.mjs";

test("Lane B: multi-process panel ceremony verifies raw 0 with a real ≥2-reviewer split", () => {
  const r = runCeremony();
  assert.equal(r.raw, 0, "ceremony bundle verifies (audit)");
  assert.ok(r.reviewers >= 2, "≥2 reviewers");
  assert.equal(r.nontrivial, true, "no single reviewer covers all of S");
  assert.equal(r.fullCover, true, "⋃C = S");
});
