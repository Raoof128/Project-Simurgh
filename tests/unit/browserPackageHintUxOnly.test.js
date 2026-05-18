import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SDK_PATH = "public/sdk/simurgh-browser-sdk.js";

test("SDK exposes browser_package_hint via getDeviceShieldStatus", () => {
  const sdk = readFileSync(SDK_PATH, "utf8");
  assert.ok(/browser_package_hint/.test(sdk), "browser_package_hint missing from SDK");
});

test("SDK exposes daemon_unreachable_hint with soft UX wording (not suspicion wording)", () => {
  const sdk = readFileSync(SDK_PATH, "utf8");
  assert.ok(/daemon_unreachable_hint/.test(sdk), "daemon_unreachable_hint missing");
  // The recommended literal contains "Local daemon unavailable" + a soft suggestion.
  assert.ok(/Local daemon unavailable/.test(sdk), "soft UX wording missing");
  // Suspicion wording must NEVER appear in the SDK.
  for (const phrase of [
    "suspicious sandboxed browser",
    "cheating detected",
    "misconduct detected",
    "violation confirmed",
  ]) {
    assert.ok(!sdk.toLowerCase().includes(phrase), `SDK contains suspicion wording: ${phrase}`);
  }
});

test("SDK trust-boundary comment is preserved", () => {
  const sdk = readFileSync(SDK_PATH, "utf8");
  assert.ok(
    /server NEVER (consults|trusts)|TRUST BOUNDARY/i.test(sdk),
    "SDK trust-boundary comment removed or weakened"
  );
});

test("server.js does not reference browser_package_hint (UX-only trust boundary)", () => {
  const src = readFileSync("server.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(src),
    "server.js references browser_package_hint — must be UX-only, server never trusts"
  );
});

test("daemonProof validator does not reference browser_package_hint", () => {
  const proof = readFileSync("src/device/daemonProof.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(proof),
    "daemonProof.js references browser_package_hint — UX-only fields must not flow into signed proofs"
  );
});

test("platformScannerSchema does not reference browser_package_hint", () => {
  const schema = readFileSync("src/device/platformScannerSchema.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(schema),
    "platformScannerSchema references browser_package_hint — UX-only fields must not be schema-validated as trusted"
  );
});

test("scannerRiskPolicy does not branch on browser_package_hint", () => {
  const risk = readFileSync("src/device/scannerRiskPolicy.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(risk),
    "scannerRiskPolicy references browser_package_hint — UX-only fields must not affect risk"
  );
});

test("reportBuilder does not surface browser_package_hint in device_integrity", () => {
  const r = readFileSync("src/academic/reportBuilder.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(r),
    "reportBuilder references browser_package_hint — UX-only fields must stay client-side"
  );
});
