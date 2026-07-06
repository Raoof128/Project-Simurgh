// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  PCCC_RAW_CODES,
  PCCC_CHECK_ORDER,
  PCCC_REASONS_90,
  PCCC_REASONS_93,
  PCCC_REASONS_96,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("pccc raw codes 90-99 are frozen (spec §6.1)", () => {
  assert.deepEqual(PCCC_RAW_CODES, {
    PCCC_TRANSCRIPT_SCHEMA_INVALID: 90,
    OPERATOR_IDENTITY_SIGNATURE_INVALID: 91,
    MATCH_CLAIM_CONFLICT: 92,
    DDH_TRANSCRIPT_MISMATCH: 93,
    SMALL_ORDER_OR_ALL_ZERO_FAIL_CLOSED: 94,
    CROSS_EPOCH_REPLAY_DETECTED: 95,
    EPHEMERAL_KEY_REUSE_DETECTED: 96,
    DISCLOSURE_BUDGET_EXCEEDED: 97,
    VFR_EXPORT_GATE_FAILED: 98,
    PUBLIC_HERD_TOKEN_VIOLATION: 99,
  });
});

test("normative check order is frozen (spec §6.4)", () => {
  assert.deepEqual(PCCC_CHECK_ORDER, [90, 91, 94, 95, 96, 93, 92, 99, 97, 98]);
});

test("subreason ledgers are frozen (spec §6.2, §6.3)", () => {
  assert.deepEqual(PCCC_REASONS_90, [
    "pccc_token_commitment_missing",
    "pccc_token_commitment_opening_invalid",
    "pccc_phase_order_invalid",
    "slot_cardinality_commitment_missing",
    "slot_cardinality_mismatch",
    "slot_terminal_record_missing",
    "window_match_census_mismatch",
  ]);
  assert.deepEqual(PCCC_REASONS_93, [
    "token_recompute_mismatch",
    "dleq_mask_proof_invalid",
    "dleq_z_proof_invalid",
  ]);
  assert.deepEqual(PCCC_REASONS_96, [
    "mask_reuse_detected",
    "ephemeral_public_digest_reuse_detected",
  ]);
});

test("registry maps 90-99 to stage-4 code 1 and 100 is unknown (3)", () => {
  for (let raw = 90; raw <= 99; raw++) assert.equal(stage4CodeForRawCode(raw), 1);
  assert.equal(stage4CodeForRawCode(100), 3);
});
