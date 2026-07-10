// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the additive raw-code ledger (300–315) lives in the GLOBAL exitCodes.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VSD_RAW_CODES,
  VSD_PUBLIC_CHECK_ORDER,
  VSD_AUDIT_CHECK_ORDER,
  VSD_AUDIT_ONLY_CODES,
  VSD_POLICY_CODES,
  stage4CodeForRawCode,
  UNKNOWN_RAW_PROBE,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const EXPECTED = {
  OK: 0,
  VSD_SCHEMA_INVALID: 300,
  VSD_ATTESTATION_TRUST_OR_SIGNATURE_INVALID: 301,
  VSD_INVENTORY_SIGNATURE_INVALID: 302,
  VSD_CLAIM_OUTSIDE_INVENTORY: 303,
  VSD_SCOPE_UNBOUND: 304,
  VSD_ARTEFACT_UNACCOUNTED: 305,
  VSD_REDACTION_UNTYPED: 306,
  VSD_ARTEFACT_DIGEST_MISMATCH: 307,
  VSD_REVIEW_HOST_UNPINNED: 308,
  VSD_REVIEW_RECEIPT_INVALID: 309,
  VSD_RECOMPUTE_RECIPE_INVALID: 310,
  VSD_TIER_OVERCLAIM: 311,
  VSD_EVIDENTIAL_INVERSION: 312,
  VSD_AUDIT_CENSUS_MISMATCH: 313,
  VSD_POLICY_REJECTED: 314,
  INTERNAL_OR_ENV_UNAVAILABLE_VSD: 315,
};

test("VSD_RAW_CODES matches the frozen name→raw map", () => {
  assert.deepEqual({ ...VSD_RAW_CODES }, EXPECTED);
  assert.ok(Object.isFrozen(VSD_RAW_CODES));
});

test("check orders are frozen and correctly partitioned", () => {
  assert.deepEqual(
    [...VSD_PUBLIC_CHECK_ORDER],
    [300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312]
  );
  assert.deepEqual(
    [...VSD_AUDIT_CHECK_ORDER],
    [300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313]
  );
  assert.deepEqual([...VSD_AUDIT_ONLY_CODES], [313]);
  assert.deepEqual([...VSD_POLICY_CODES], [314]);
  // public order excludes audit-only (313), policy (314), wrapper (315)
  for (const c of [313, 314, 315]) assert.ok(!VSD_PUBLIC_CHECK_ORDER.includes(c));
  // audit order excludes policy (314) and wrapper (315)
  for (const c of [314, 315]) assert.ok(!VSD_AUDIT_CHECK_ORDER.includes(c));
});

test("every VSD raw code is a run-level-1 (recomputable) code", () => {
  for (let raw = 300; raw <= 315; raw++) {
    assert.equal(stage4CodeForRawCode(raw), 1, `raw ${raw} must map to run level 1`);
  }
});

test("VSD codes are disjoint from 0–299 and from the unknown probe", () => {
  const vals = Object.values(EXPECTED).filter((v) => v !== 0);
  assert.equal(new Set(vals).size, vals.length, "no duplicate raws");
  assert.equal(Math.min(...vals), 300);
  assert.equal(Math.max(...vals), 315);
  assert.notEqual(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 1);
});
