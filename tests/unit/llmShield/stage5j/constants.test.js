// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — constants (plan Task 1.1). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODES,
  DOMAINS,
  RATING_STATE,
  CORRECTNESS_FORBIDDEN_KEYS,
  VRC_RESERVED_ARTIFACT_SLOTS,
  VRC_MINTED_SOCKETS,
  RUNG,
  rungGte,
} from "../../../../tools/simurgh-attestation/stage5j/constants.mjs";

test("CODES re-exported from the global registry, OK===0", () => {
  assert.equal(CODES.OK, 0);
  assert.equal(CODES.VRC_SCHEMA_INVALID, 332);
  assert.equal(CODES.INTERNAL_OR_ENV_UNAVAILABLE_VRC, 347);
});

test("RATING_STATE has exactly the two orthogonal enums (spec §1)", () => {
  assert.deepEqual(RATING_STATE.comparison, [
    "non_comparable",
    "comparable_uncontested",
    "comparable_contested",
  ]);
  assert.deepEqual(RATING_STATE.contest, [
    "not_applicable",
    "contested_unanswered",
    "contested_response_recorded",
    "reviewer_concurrence_backed",
    "contested_reviewer_maintains",
  ]);
});

test("reserved artifact slots (3, for 346) are distinct from minted sockets (2)", () => {
  assert.equal(VRC_RESERVED_ARTIFACT_SLOTS.length, 3);
  assert.equal(VRC_MINTED_SOCKETS.length, 2);
  assert.ok(VRC_RESERVED_ARTIFACT_SLOTS.includes("universe_commitment_anchor"));
  assert.ok(VRC_RESERVED_ARTIFACT_SLOTS.includes("review_window_binding"));
  assert.ok(VRC_RESERVED_ARTIFACT_SLOTS.includes("campaign_composition_root"));
  // external_registry_anchor is an ACTIVE optional field, NOT a 346 slot
  assert.ok(!VRC_RESERVED_ARTIFACT_SLOTS.includes("external_registry_anchor"));
  assert.ok(VRC_MINTED_SOCKETS.includes("rating_truth_oracle_deferred"));
  assert.ok(VRC_MINTED_SOCKETS.includes("response_adequacy_deferred"));
});

test("DOMAINS + G13 forbidden-correctness vocabulary present", () => {
  assert.equal(typeof DOMAINS.contest_event, "string");
  assert.equal(typeof DOMAINS.reviewer_rating, "string");
  assert.ok(CORRECTNESS_FORBIDDEN_KEYS instanceof Set);
  assert.ok(CORRECTNESS_FORBIDDEN_KEYS.has("producer_wrong"));
});

test("RUNG lattice re-instantiated (VFC ladder for Lane C)", () => {
  assert.deepEqual(RUNG.order, ["distinct_key_only", "challenge_bound", "externally_anchored"]);
  assert.ok(rungGte("externally_anchored", "challenge_bound"));
  assert.ok(!rungGte("distinct_key_only", "challenge_bound"));
});
