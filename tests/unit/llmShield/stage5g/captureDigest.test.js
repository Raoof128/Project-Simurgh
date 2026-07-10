import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { checkCaptureDigest } from "../../../../tools/simurgh-attestation/stage5g/core/captureDigest.mjs";

test("valid bundle passes capture digest", () => {
  assert.equal(checkCaptureDigest(validBundle()), null);
});

test("mutated cell (no resign) → 288", () => {
  const b = validBundle();
  b.capture.cells[0].label = "malicious";
  assert.equal(checkCaptureDigest(b), 288);
});
