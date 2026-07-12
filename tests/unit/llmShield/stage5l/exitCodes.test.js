// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — raw-code registration + house partition + run-level + golden-lock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  VTCQ_RAW_CODES,
  VTCQ_PUBLIC_CHECK_ORDER,
  VTCQ_AUDIT_CHECK_ORDER,
  VTCQ_AUDIT_ONLY_CODES,
  VTCQ_POLICY_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VTC-Q codes are OK:0 + the contiguous 364..383 block", () => {
  assert.equal(VTCQ_RAW_CODES.OK, 0);
  const allocated = Object.values(VTCQ_RAW_CODES)
    .filter((n) => n !== 0)
    .sort((a, b) => a - b);
  assert.deepEqual(
    allocated,
    Array.from({ length: 20 }, (_, i) => 364 + i)
  );
  assert.equal(VTCQ_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VTCQ, 383);
});

test("house partition: public spine 364..380 (frozen order), audit adds 381, policy 382, wrapper 383", () => {
  // The public spine is NOT numeric: 380 (finality) runs after 370; 374 before 375; 373 after 375.
  assert.deepEqual(
    VTCQ_PUBLIC_CHECK_ORDER,
    [364, 365, 366, 367, 368, 369, 370, 380, 371, 372, 374, 375, 373, 376, 377, 378, 379]
  );
  assert.deepEqual(VTCQ_AUDIT_CHECK_ORDER, [...VTCQ_PUBLIC_CHECK_ORDER, 381]);
  assert.deepEqual(VTCQ_AUDIT_ONLY_CODES, [381]);
  assert.deepEqual(VTCQ_POLICY_CODES, [382]);
  // public partition is exactly 364..380 as a set
  assert.deepEqual(
    [...VTCQ_PUBLIC_CHECK_ORDER].sort((a, b) => a - b),
    Array.from({ length: 17 }, (_, i) => 364 + i)
  );
});

test("every VTC-Q raw code is a run-level-1 rejection (wrapper included)", () => {
  for (let c = 364; c <= 383; c++) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `raw ${c}`);
  assert.equal(stage4CodeForRawCode(383), 1); // NOT 3 — per-stage wrapper convention
  assert.equal(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 3); // unknown still 3 — never a bare literal
});

test("both exit-map goldens carry 364..383 -> 1", () => {
  for (const p of [
    "docs/research/llm-shield/evidence/stage-4h/exit-map.json",
    "tests/fixtures/llmShield/stage4h/expected-results/exit-map.json",
  ]) {
    const m = JSON.parse(readFileSync(p, "utf8"));
    const map = m.run_level_by_raw ?? m.map ?? m;
    for (let c = 364; c <= 383; c++) assert.equal(map[String(c)], 1, `${p}:${c}`);
  }
});
