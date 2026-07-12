// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — exit codes 332-347 (plan Task 0.2). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  VRC_RAW_CODES,
  VRC_PUBLIC_CHECK_ORDER,
  VRC_AUDIT_CHECK_ORDER,
  VRC_AUDIT_ONLY_CODES,
  VRC_POLICY_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("raw codes 332-347, wrapper LAST at 347 (suffixed _VRC)", () => {
  const vals = Object.values(VRC_RAW_CODES).filter((v) => v !== 0);
  assert.deepEqual(
    [...vals].sort((a, b) => a - b),
    [332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347]
  );
  assert.equal(VRC_RAW_CODES.VRC_SCHEMA_INVALID, 332);
  assert.equal(VRC_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VRC, 347);
});

test("public first-failure 332..344; audit adds 345; policy 346; wrapper 347 outside the scan", () => {
  assert.deepEqual(
    VRC_PUBLIC_CHECK_ORDER,
    [332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344]
  );
  assert.deepEqual(
    VRC_AUDIT_CHECK_ORDER,
    [332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345]
  );
  assert.deepEqual(VRC_AUDIT_ONLY_CODES, [345]);
  assert.deepEqual(VRC_POLICY_CODES, [346]);
  assert.ok(!VRC_PUBLIC_CHECK_ORDER.includes(345));
  assert.ok(!VRC_AUDIT_CHECK_ORDER.includes(346));
  assert.ok(!VRC_AUDIT_CHECK_ORDER.includes(347));
});

test("every 332..347 is a run-level-1 attestation failure (house convention, cf. 331/315)", () => {
  for (let raw = 332; raw <= 347; raw++) {
    assert.equal(RUN_LEVEL_BY_RAW[raw], 1, `raw ${raw}`);
  }
});

test("unknown probe still fails closed to run level 3", () => {
  assert.equal(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 3);
});

test("both exit-map goldens carry 332–347 → 1", () => {
  const ROOT = join(import.meta.dirname, "../../../..");
  for (const rel of [
    "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
    "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
  ]) {
    const m = JSON.parse(readFileSync(join(ROOT, rel), "utf8")).run_level_by_raw;
    for (let c = 332; c <= 347; c++) {
      assert.equal(m[String(c)], 1, `${rel} raw ${c}`);
    }
  }
});
