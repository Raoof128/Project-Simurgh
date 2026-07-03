// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VXD_RAW_CODES,
  VXD_REASONS_43,
  VXD_REASONS_45,
  VXD_REASONS_46,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

test("vxd raw codes are 43-46 and map to run-level 1", () => {
  assert.equal(VXD_RAW_CODES.MERGE_EVENT_INVALID, 43);
  assert.equal(VXD_RAW_CODES.ANTI_MONOTONICITY_VIOLATION, 44);
  assert.equal(VXD_RAW_CODES.DISCLOSURE_CLAIM_CONFLICT, 45);
  assert.equal(VXD_RAW_CODES.RESPONDENT_CONTEST_INVALID, 46);
  for (const code of Object.values(VXD_RAW_CODES)) {
    assert.equal(stage4CodeForRawCode(code), 1);
  }
});

test("raw 39 stays reserved and unknown codes fail closed to 3", () => {
  assert.equal(stage4CodeForRawCode(39), 3);
  assert.equal(stage4CodeForRawCode(47), 3);
  assert.equal(stage4CodeForRawCode(-1), 3);
});

test("vxd reason enums are closed, sorted, spec-exact", () => {
  assert.deepEqual(VXD_REASONS_43, [
    "budget_inflation",
    "duplicate_old_cluster",
    "graph_version_mismatch",
    "invalid_merge_basis",
    "non_coarsening_split",
    "omitted_old_cluster",
    "parent_digest_mismatch",
    "raw_identity_exported",
    "schema_invalid",
    "sequence_gap",
    "unknown_old_cluster",
  ]);
  assert.deepEqual(VXD_REASONS_45, [
    "claim_recompute_mismatch",
    "commitment_sequenced_after_disclosure",
    "pincer_slot_not_null",
    "schema_invalid",
    "unknown_claim_kind",
  ]);
  assert.deepEqual(VXD_REASONS_46, [
    "dangling_contest_digest",
    "dangling_record_reference",
    "schema_invalid",
    "signature_invalid",
    "unknown_contest_type",
  ]);
});
