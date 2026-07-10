// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — constants + score helpers (plan Task 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VMP_SCHEMAS,
  VMP_RAW_CODES,
  VMP_CHECK_ORDER,
  VMP_AUDIT_CODES,
  VMP_PUBLIC_CODES,
  DECISION_SEMANTICS,
  CELL_STATUS,
  PROVENANCE_MODES,
  SCORE_PRECISION,
  AGGREGATE_FORBIDDEN_KEYS,
  VMP_RESERVED_SLOTS,
  validateScore,
  scoreGte,
} from "../../../../tools/simurgh-attestation/stage5f/constants.mjs";

test("schemas are the frozen v1 strings", () => {
  assert.equal(VMP_SCHEMAS.ATTESTATION, "simurgh.vmp.panel_attestation.v1");
  assert.equal(VMP_SCHEMAS.CAPTURE_CENSUS, "simurgh.vmp.capture_census.v1");
  assert.equal(VMP_SCHEMAS.LANEB_RECEIPT, "simurgh.vmp.blind_recompute_receipt.v1");
  assert.equal(VMP_SCHEMAS.BYO_PANEL, "simurgh.vmp.byo_panel.v1");
});

test("raw codes re-exported from the global ledger, 268..282", () => {
  assert.equal(VMP_RAW_CODES.VMP_SCHEMA_INVALID, 268);
  assert.equal(VMP_RAW_CODES.INTERNAL_OR_ENV_UNAVAILABLE_VMP, 282);
  assert.deepEqual(
    VMP_CHECK_ORDER,
    [268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280]
  );
  // audit runs the full set; public excludes ONLY the audit-only census code 280.
  assert.deepEqual(VMP_AUDIT_CODES, VMP_CHECK_ORDER);
  assert.ok(!VMP_PUBLIC_CODES.includes(280));
  assert.deepEqual(
    VMP_AUDIT_CODES.filter((c) => !VMP_PUBLIC_CODES.includes(c)),
    [280]
  );
});

test("enums are frozen", () => {
  assert.deepEqual(
    [...DECISION_SEMANTICS],
    ["binary_malicious_softmax", "categorical_allow_block"]
  );
  assert.deepEqual(
    [...CELL_STATUS],
    ["evaluated", "not_applicable", "unsupported_input", "capture_failed", "missing_capture"]
  );
  assert.deepEqual([...PROVENANCE_MODES], ["historical_verifier", "reference_binding", "none"]);
  assert.equal(SCORE_PRECISION, 4);
  assert.ok(AGGREGATE_FORBIDDEN_KEYS.includes("panel_score"));
  assert.ok(VMP_RESERVED_SLOTS.includes("panel_aggregation_policy_deferred"));
  assert.ok(Object.isFrozen(DECISION_SEMANTICS));
});

test("validateScore accepts exact-width [0,1] decimals only", () => {
  assert.equal(validateScore("0.8123"), "0.8123");
  assert.equal(validateScore("1.0000"), "1.0000");
  assert.equal(validateScore("0.0000"), "0.0000");
  for (const bad of ["12.3456", "0.812", "0.81234", "1.0001", ".5000", "0.5", "abcd", "1.5000"]) {
    assert.throws(() => validateScore(bad), /score/i, `should reject ${bad}`);
  }
});

test("scoreGte is exact lexical comparison (no arithmetic)", () => {
  assert.equal(scoreGte("0.8123", "0.5000"), true);
  assert.equal(scoreGte("0.5000", "0.5000"), true);
  assert.equal(scoreGte("0.0600", "0.5000"), false);
  assert.equal(scoreGte("1.0000", "0.9999"), true);
  assert.throws(() => scoreGte("0.5", "0.5000"), /score/i);
});
