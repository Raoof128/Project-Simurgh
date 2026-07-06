// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S raw-code registry gate (4S spec §11). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VDCC_RAW_CODES,
  VDCC_CHECK_ORDER,
  VDCC_REASONS_100,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("VDCC_RAW_CODES is exactly the closed 100-118 block in spec order", () => {
  assert.deepEqual(VDCC_RAW_CODES, {
    MALFORMED_CHAIN_BUNDLE: 100,
    SIGNATURE_INVALID: 101,
    ROOT_MISSING_OR_MULTIPLE: 102,
    PARENT_DIGEST_MISMATCH: 103,
    CYCLE_DETECTED: 104,
    UNREACHABLE_NODE: 105,
    FANOUT_COUNT_MISMATCH: 106,
    FANOUT_CHILD_SET_MISMATCH: 107,
    SCOPE_ATTENUATION_VIOLATION: 108,
    BUDGET_FLUX_VIOLATION: 109,
    LOCAL_SPEND_OVERFLOW: 110,
    GHOST_HOP_DETECTED: 111,
    RECEIPTLESS_AUTHORITY_CROSSING: 112,
    SPLIT_BRAIN_CHILD: 113,
    EPOCH_REPLAY: 114,
    ROOT_REPLAY: 115,
    SPINE_REF_MISMATCH: 116,
    MERKLE_BUNDLE_MISMATCH: 117,
    INTERNAL_FAIL_CLOSED: 118,
  });
  assert.ok(Object.isFrozen(VDCC_RAW_CODES));
});

test("frozen check order matches spec §11 exactly and is a permutation of 100-118", () => {
  assert.deepEqual(
    VDCC_CHECK_ORDER,
    [100, 101, 102, 103, 113, 104, 105, 106, 107, 108, 110, 109, 112, 111, 114, 115, 116, 117, 118]
  );
  assert.deepEqual(
    [...VDCC_CHECK_ORDER].sort((a, b) => a - b),
    Object.values(VDCC_RAW_CODES).sort((a, b) => a - b)
  );
});

test("every VDCC code maps to run level 1 and stays out of the unknown bucket", () => {
  for (let raw = 100; raw <= 118; raw++) assert.equal(stage4CodeForRawCode(raw), 1);
  assert.equal(stage4CodeForRawCode(999), 3); // permanent unknown probe value
});

test("VDCC_REASONS_100 covers the malformed species from spec §4 and §11", () => {
  assert.ok(VDCC_REASONS_100.includes("duplicate_declared_child_digests"));
  assert.ok(VDCC_REASONS_100.includes("required_signature_field_missing"));
  assert.ok(VDCC_REASONS_100.includes("public_key_index_missing_or_malformed"));
  assert.ok(Object.isFrozen(VDCC_REASONS_100));
});
