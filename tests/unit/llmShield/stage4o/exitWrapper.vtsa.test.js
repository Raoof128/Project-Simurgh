// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VTSA_RAW_CODES,
  VTSA_CHECK_ORDER,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("vtsa raw codes 55-66 are frozen and complete", () => {
  assert.deepEqual(VTSA_RAW_CODES, {
    MANIFEST_MISSING: 55,
    MANIFEST_SIGNATURE_INVALID: 56,
    MANIFEST_EPOCH_INVALID: 57,
    SERVER_OR_TOOLSET_DIGEST_MISMATCH: 58,
    TOOL_IDENTITY_MISMATCH: 59,
    TOOL_SCHEMA_DIGEST_MISMATCH: 60,
    AUTHORITY_CLASS_UPGRADE: 61,
    DECLARED_SINK_EXPANSION: 62,
    MANIFEST_RECEIPT_BINDING_MISMATCH: 63,
    DRIFT_LAUNDERING_DETECTED: 64,
    BLIND_REAPPROVAL: 65,
    TIMELINE_BINDING_MISMATCH: 66,
  });
  assert.ok(Object.isFrozen(VTSA_RAW_CODES));
});

test("documented check order is normative, not numeric", () => {
  assert.deepEqual([...VTSA_CHECK_ORDER], [55, 56, 57, 64, 65, 58, 59, 60, 61, 62, 63, 66]);
});

test("all twelve map to run-level 1; unknown still fails closed to 3", () => {
  for (let raw = 55; raw <= 66; raw++) assert.equal(RUN_LEVEL_BY_RAW[raw], 1);
  // 67-79 are Stage 4P VOCA, 80-89 are Stage 4Q VFR codes (mapped to 1); 90+ is unknown.
  assert.equal(stage4CodeForRawCode(90), 3);
  assert.equal(stage4CodeForRawCode(29), 3);
});
