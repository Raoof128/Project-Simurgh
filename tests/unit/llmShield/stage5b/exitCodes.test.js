// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — exit codes 210-224 (plan Task 1). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VAR_RAW_CODES,
  VAR_CHECK_ORDER,
  VAR_PUBLIC_CODES,
  VAR_AUDIT_CODES,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("raw codes 210-224, wrapper LAST at 224", () => {
  const vals = Object.values(VAR_RAW_CODES);
  assert.deepEqual(
    [...vals].sort((a, b) => a - b),
    [210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224]
  );
  assert.equal(VAR_RAW_CODES.INTERNAL_FAIL_CLOSED_VAR, 224);
});

test("check order is 210..223, wrapper 224 excluded", () => {
  assert.deepEqual(
    VAR_CHECK_ORDER,
    [210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223]
  );
  assert.ok(!VAR_CHECK_ORDER.includes(224));
});

test("audit = all of 210..223; public is a STRICT subset EXCLUDING 217 (gauntlet-2 P1-A)", () => {
  assert.deepEqual(
    VAR_AUDIT_CODES,
    [210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223]
  );
  // public ⊊ audit
  assert.ok(VAR_PUBLIC_CODES.length < VAR_AUDIT_CODES.length);
  for (const c of VAR_PUBLIC_CODES) assert.ok(VAR_AUDIT_CODES.includes(c));
  // 217 (No Silent Bypass truthfulness) is AUDIT-ONLY — public trusts the recorded target_raw.
  assert.ok(!VAR_PUBLIC_CODES.includes(217));
  assert.ok(VAR_AUDIT_CODES.includes(217));
});

test("every 210..224 is a run-level-1 attestation failure", () => {
  for (let raw = 210; raw <= 224; raw++) {
    assert.equal(RUN_LEVEL_BY_RAW[raw], 1, `raw ${raw}`);
  }
});
