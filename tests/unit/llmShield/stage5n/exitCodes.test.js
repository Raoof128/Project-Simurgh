// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — VTC-Delay exit-code ledger (additive 396-419; single first-failure spine; wrapper 419 outside it).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VTCDELAY_RAW_CODES,
  VTCDELAY_CHECK_ORDER,
  VTCDELAY_WRAPPER,
  RUN_LEVEL_BY_RAW,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const BAND = Array.from({ length: 24 }, (_, i) => 396 + i); // 396..419

test("VTCDELAY_RAW_CODES: OK + 396..419, unique, disjoint from <=395", () => {
  const vals = Object.values(VTCDELAY_RAW_CODES);
  assert.equal(VTCDELAY_RAW_CODES.OK, 0);
  const nonZero = vals.filter((v) => v !== 0).sort((a, b) => a - b);
  assert.deepEqual(nonZero, BAND);
  assert.equal(new Set(vals).size, vals.length); // unique
  for (const v of nonZero) assert.ok(v >= 396 && v <= 419, `${v} out of additive band`);
});

test("first-failure spine: 396..418 in numeric order, wrapper 419 NOT present", () => {
  assert.deepEqual(
    VTCDELAY_CHECK_ORDER,
    Array.from({ length: 23 }, (_, i) => 396 + i)
  );
  assert.ok(!VTCDELAY_CHECK_ORDER.includes(419), "419 is the outer boundary, not a predicate");
  assert.equal(VTCDELAY_WRAPPER, 419);
  assert.equal(VTCDELAY_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VTCDELAY, 419);
});

test("named codes bind to the frozen taxonomy", () => {
  assert.equal(VTCDELAY_RAW_CODES.DELAY_ENVELOPE_MALFORMED, 396);
  assert.equal(VTCDELAY_RAW_CODES.FINAL_ENVELOPE_SIGNATURE_INVALID, 397);
  assert.equal(VTCDELAY_RAW_CODES.INPUT_COMMITMENT_MISMATCH, 398);
  assert.equal(VTCDELAY_RAW_CODES.DELAY_POLICY_DIGEST_MISMATCH, 399);
  assert.equal(VTCDELAY_RAW_CODES.DELAY_POLICY_NOT_ACCEPTED, 400);
  assert.equal(VTCDELAY_RAW_CODES.FRESHNESS_CHALLENGE_INVALID_OR_REUSED, 401);
  assert.equal(VTCDELAY_RAW_CODES.START_REQUEST_BINDING_INVALID, 402);
  assert.equal(VTCDELAY_RAW_CODES.START_REQUEST_SIGNATURE_INVALID, 403);
  assert.equal(VTCDELAY_RAW_CODES.START_ENDPOINT_SUBJECT_MISMATCH, 404);
  assert.equal(VTCDELAY_RAW_CODES.START_TOKEN_INVALID, 405);
  assert.equal(VTCDELAY_RAW_CODES.START_ENDPOINT_ANCHOR_INCOMPLETE, 406);
  assert.equal(VTCDELAY_RAW_CODES.ITERATION_COUNT_MISMATCH, 407);
  assert.equal(VTCDELAY_RAW_CODES.IMPLEMENTATION_COMMITMENT_MISMATCH, 408);
  assert.equal(VTCDELAY_RAW_CODES.SEED_DERIVATION_MISMATCH, 409);
  assert.equal(VTCDELAY_RAW_CODES.CHECKPOINT_LADDER_MISMATCH, 410);
  assert.equal(VTCDELAY_RAW_CODES.DELAY_RECOMPUTATION_FAILURE, 411);
  assert.equal(VTCDELAY_RAW_CODES.DECISION_BINDING_MISMATCH, 412);
  assert.equal(VTCDELAY_RAW_CODES.OUTPUT_COMMITMENT_MISMATCH, 413);
  assert.equal(VTCDELAY_RAW_CODES.END_ENDPOINT_SUBJECT_MISMATCH, 414);
  assert.equal(VTCDELAY_RAW_CODES.END_ENDPOINT_ANCHOR_INCOMPLETE, 415);
  assert.equal(VTCDELAY_RAW_CODES.TSA_UNCERTAINTY_UNRESOLVED, 416);
  assert.equal(VTCDELAY_RAW_CODES.INSUFFICIENT_TIMESTAMP_SEPARATION, 417);
  assert.equal(VTCDELAY_RAW_CODES.INTERPRETABILITY_EVIDENCE_INVALID_OR_UNBOUND, 418);
});

test("RUN_LEVEL_BY_RAW: every 396..419 is run level 1", () => {
  for (const c of BAND) assert.equal(RUN_LEVEL_BY_RAW[c], 1, `raw ${c}`);
});
