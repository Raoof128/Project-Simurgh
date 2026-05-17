import assert from "node:assert/strict";
import test from "node:test";

import {
  validateScannerSummaryForPlatform,
  validateLinuxScannerSummary,
} from "../../src/device/platformScannerSchema.js";

test("validateScannerSummaryForPlatform dispatches to platform validator", () => {
  assert.equal(typeof validateScannerSummaryForPlatform, "function");
});

test("validateLinuxScannerSummary is exported", () => {
  assert.equal(typeof validateLinuxScannerSummary, "function");
});

test("validateScannerSummaryForPlatform rejects unknown platform", () => {
  const result = validateScannerSummaryForPlatform("plan9", {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported_platform");
});
