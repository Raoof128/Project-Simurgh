// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HARNESS_CODES,
  OFFLINE_REASONS,
  RAW_VERIFIER_CODES,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("Stage 4H.4 exit wrapper is total over every raw verifier and harness code", () => {
  const rawCodes = [...Object.values(RAW_VERIFIER_CODES), ...Object.values(HARNESS_CODES)];
  for (const raw of rawCodes) {
    assert.equal([0, 1, 2, 3].includes(stage4CodeForRawCode(raw)), true, String(raw));
  }
});

test("Stage 4H.4 exit wrapper matches the frozen raw-to-run-level table", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  for (const raw of [19, 20, 21, 22, 23, 24, 25, 26, 27]) {
    assert.equal(stage4CodeForRawCode(raw), 1, String(raw));
  }
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
});

test("Stage 4H.4 exit wrapper fails closed on unknown raw codes", () => {
  for (const raw of [999, -1, undefined, null, "4D_VERIFY_FAILURE"]) {
    assert.equal(stage4CodeForRawCode(raw), 3, String(raw));
  }
});

test("Stage 4H.4 exit map is explicit and collision-bounded", () => {
  assert.deepEqual(
    RUN_LEVEL_BY_RAW,
    Object.freeze({
      0: 0,
      19: 1,
      20: 1,
      21: 1,
      22: 1,
      23: 1,
      24: 1,
      25: 1,
      26: 1,
      27: 1,
      28: 2,
      29: 3,
      // Stage 4K EBA code (reviewed extension of the shared ledger; 4K spec §0.2).
      30: 1,
      // Stage 4J PCTA codes (reviewed extension of the shared ledger; spec §0.3).
      31: 1,
      32: 1,
      33: 1,
      34: 1,
      35: 1,
      36: 1,
      37: 1,
      38: 1,
      // Stage 4L CCB codes (reviewed extension of the shared ledger; 4L spec §2). Raw 39
      // stays reserved (v1 extraction_scope_violation) and is deliberately unmapped.
      40: 1,
      41: 1,
      42: 1,
      // Stage 4M VXD codes (reviewed extension of the shared ledger; 4M spec §3).
      43: 1,
      44: 1,
      45: 1,
      46: 1,
    })
  );
});

test("Stage 4H.4 offline reason list covers every denied surface", () => {
  assert.deepEqual(
    OFFLINE_REASONS,
    Object.freeze([
      "fetch_invoked",
      "http_client_invoked",
      "socket_connect_invoked",
      "dns_invoked",
      "udp_invoked",
      "subprocess_invoked",
      "model_client_present",
      "forbidden_builtin_imported",
      "hermeticity_falsifier_not_tested",
    ])
  );
});
