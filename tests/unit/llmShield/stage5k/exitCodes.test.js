// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — raw-code registration + house partition + run-level + golden-lock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VUC_RAW_CODES,
  VUC_PUBLIC_CHECK_ORDER,
  VUC_AUDIT_CHECK_ORDER,
  VUC_AUDIT_ONLY_CODES,
  VUC_POLICY_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VUC codes are OK:0 + the contiguous 348..363 block", () => {
  assert.equal(VUC_RAW_CODES.OK, 0);
  const allocated = Object.values(VUC_RAW_CODES)
    .filter((n) => n !== 0)
    .sort((a, b) => a - b);
  assert.deepEqual(
    allocated,
    Array.from({ length: 16 }, (_, i) => 348 + i)
  );
  assert.equal(VUC_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VUC, 363);
});

test("house partition: public 348..360, audit adds 361, policy 362, wrapper 363", () => {
  assert.deepEqual(
    VUC_PUBLIC_CHECK_ORDER,
    [348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360]
  );
  assert.deepEqual(
    VUC_AUDIT_CHECK_ORDER,
    [348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361]
  );
  assert.deepEqual(VUC_AUDIT_ONLY_CODES, [361]);
  assert.deepEqual(VUC_POLICY_CODES, [362]);
});

test("every VUC raw code is a run-level-1 rejection (wrapper included)", () => {
  for (let c = 348; c <= 363; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `raw ${c}`);
  assert.equal(stage4CodeForRawCode(363), 1); // NOT 3 — per-stage wrapper convention
  assert.equal(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 3); // unknown still 3 — never a bare 999 literal
});

test("both exit-map goldens carry 348..363 -> 1", () => {
  for (const p of [
    "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
    "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
  ]) {
    const m = JSON.parse(readFileSync(p, "utf8"));
    const map = m.run_level_by_raw ?? m.map ?? m;
    for (let c = 348; c <= 363; c++) assert.equal(map[String(c)], 1, `${p}:${c}`);
  }
});
