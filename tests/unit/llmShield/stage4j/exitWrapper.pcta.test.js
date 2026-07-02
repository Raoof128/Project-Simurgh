// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PCTA_RAW_CODES,
  PCTA_REASONS,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("PCTA raw codes 31-38 map to run-level 1", () => {
  for (let r = 31; r <= 38; r += 1) assert.equal(stage4CodeForRawCode(r), 1, `raw ${r}`);
});

test("reused bands keep their mapping and wrapper stays total", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
  assert.equal(stage4CodeForRawCode(24), 1); // 4H band surfaced by P4-pre
  assert.equal(stage4CodeForRawCode(9999), 3); // unknown → 3, fail-closed
});

test("PCTA code + reason inventories are frozen and complete", () => {
  assert.deepEqual(
    Object.values(PCTA_RAW_CODES).sort((a, b) => a - b),
    [31, 32, 33, 34, 35, 36, 37, 38]
  );
  assert.equal(Object.isFrozen(PCTA_REASONS), true);
  assert.equal(PCTA_REASONS.length, 8);
  for (let r = 31; r <= 38; r += 1) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, r),
      true,
      `ledger has ${r}`
    );
  }
});
