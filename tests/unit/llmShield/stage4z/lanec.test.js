// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA Lane C — CI-safe ceremony schema + offline-boundary test (plan Task 13).
// Validates BOTH outcomes without loading torch, and asserts lanec/ is outside every CI glob.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCeremony } from "../../../../tools/simurgh-attestation/stage4z/core/captureCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const CDIR = join(ROOT, "tests/fixtures/llmShield/stage4z/ceremonies");
const rd = (n) => JSON.parse(readFileSync(join(CDIR, n), "utf8"));

test("captured ceremony validates", () => {
  assert.equal(validateCeremony(rd("captured.json")), null);
});

test("capture_failed ceremony validates (carries a reason)", () => {
  assert.equal(validateCeremony(rd("capture_failed.json")), null);
});

test("bad outcome / shrunk position rule / missing fields are rejected", () => {
  assert.equal(validateCeremony({ ...rd("captured.json"), outcome: "nope" }).error, "bad_outcome");
  assert.equal(
    validateCeremony({ ...rd("captured.json"), position_rule_id: "some_positions" }).error,
    "position_rule_not_total"
  );
  const noDigest = { ...rd("captured.json") };
  delete noDigest.declaration_digest;
  assert.equal(validateCeremony(noDigest).error, "captured_missing_declaration_digest");
  const noReason = { ...rd("capture_failed.json") };
  delete noReason.reason;
  assert.equal(validateCeremony(noReason).error, "capture_failed_missing_reason");
});

test("offline boundary: lanec/ appears in NO test glob and NOT in check.sh", () => {
  const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
  assert.equal(/lanec/.test(pkg), false, "lanec must not be in package.json test globs");
  const check = readFileSync(join(ROOT, "scripts/check.sh"), "utf8");
  assert.equal(/stage4z\/lanec/.test(check), false, "lanec must not be gated by check.sh");
});
