// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EBA_RAW_CODES,
  EBA_REASONS,
  PCTA_RAW_CODES,
  RAW_VERIFIER_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("EBA raw code 30 maps to run-level 1 and fills the reserved slot", () => {
  assert.equal(EBA_RAW_CODES.EXTRACTION_BUDGET_EXCEEDED, 30);
  assert.equal(stage4CodeForRawCode(30), 1);
  assert.deepEqual(EBA_REASONS, ["extraction_budget_exceeded"]);
  assert.equal(Object.isFrozen(EBA_RAW_CODES), true);
});

test("existing bands unchanged: 4H, 28/29, PCTA 31-38", () => {
  for (const raw of [19, 20, 21, 22, 23, 24, 25, 26, 27]) {
    assert.equal(stage4CodeForRawCode(raw), 1, String(raw));
  }
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
  for (const raw of Object.values(PCTA_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(raw), 1, String(raw));
  }
  assert.equal(RAW_VERIFIER_CODES.OK, 0);
});

test("wrapper stays total and fail-closed: unknown codes (incl. reserved 39) map to 3", () => {
  // NOTE: do not probe with the STRING "30" — JS object keys are strings, so hasOwnProperty
  // treats "30" as the mapped numeric key 30 and returns 1. Probe with non-numeric strings.
  // 40-42 are Stage 4L CCB codes, 43-46 are Stage 4M VXD codes, 47-54 are Stage 4N
  // Seismograph codes, 55-66 are Stage 4O VTSA codes, 67-79 are Stage 4P VOCA codes,
  // 80-89 are Stage 4Q VFR codes (all mapped to 1); 39 stays reserved/unmapped, 90+ unknown.
  for (const raw of [39, 90, 999, -1, undefined, null, "thirty"]) {
    assert.equal(stage4CodeForRawCode(raw), 3, String(raw));
  }
  assert.equal(Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, 39), false);
});
