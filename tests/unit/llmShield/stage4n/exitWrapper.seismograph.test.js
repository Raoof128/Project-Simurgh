// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SEISMOGRAPH_RAW_CODES,
  SEISMOGRAPH_REASONS_47,
  SEISMOGRAPH_REASONS_48,
  SEISMOGRAPH_REASONS_49,
  SEISMOGRAPH_REASONS_50,
  SEISMOGRAPH_REASONS_51,
  SEISMOGRAPH_REASONS_52,
  SEISMOGRAPH_REASONS_53,
  SEISMOGRAPH_REASONS_54,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("seismograph raw codes are 47-54 and map to run-level 1", () => {
  assert.deepEqual(SEISMOGRAPH_RAW_CODES, {
    HEARTBEAT_MISSING: 47,
    HEARTBEAT_EQUIVOCATION: 48,
    HEARTBEAT_CHAIN_ORDER_INVALID: 49,
    HEARTBEAT_COMMITMENT_MISMATCH: 50,
    HEARTBEAT_INCLUSION_PROOF_INVALID: 51,
    HEARTBEAT_REVEAL_SCHEDULE_VIOLATION: 52,
    HEARTBEAT_REVEAL_BUDGET_EXCEEDED: 53,
    HEARTBEAT_PUBLIC_DISCLOSURE_VIOLATION: 54,
  });
  for (const code of Object.values(SEISMOGRAPH_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
});

test("raw 39 stays reserved and unknown codes fail closed to 3", () => {
  // 67-79 are Stage 4P VOCA codes (mapped to 1); 80+ is unknown.
  for (const raw of [39, 80, 99, 999, -1, undefined, null, "forty-seven"]) {
    assert.equal(stage4CodeForRawCode(raw), 3);
  }
});

test("seismograph reason enums are closed, sorted, spec-exact", () => {
  assert.deepEqual(SEISMOGRAPH_REASONS_47, ["heartbeat_absent_for_expected_window"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_48, ["cross_artifact_digest_mismatch"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_49, [
    "duplicate_record",
    "interleave_order_violation",
    "position_discontinuity",
    "prev_digest_mismatch",
    "schema_invalid",
    "window_outside_schedule",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_50, [
    "private_evidence_root_mismatch",
    "reveal_commitment_mismatch",
    "source_root_mismatch",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_51, [
    "proof_path_invalid",
    "referenced_heartbeat_absent",
    "unknown_tier",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_52, ["reveal_early", "reveal_overdue"]);
  assert.deepEqual(SEISMOGRAPH_REASONS_53, [
    "band_vector_space_exceeds_budget",
    "self_leakage_recompute_mismatch",
    "undeclared_band_dimension",
  ]);
  assert.deepEqual(SEISMOGRAPH_REASONS_54, [
    "inclusion_proof_material_public",
    "raw_count_public",
    "respondent_material_public",
    "tier_label_public",
  ]);
  for (const e of [SEISMOGRAPH_REASONS_49, SEISMOGRAPH_REASONS_50, SEISMOGRAPH_REASONS_52]) {
    assert.deepEqual([...e].sort(), [...e]);
  }
});
