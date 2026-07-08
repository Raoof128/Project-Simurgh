// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — K7 all-functions E2E net (plan Task 15). Exercises every export + the tamper
// matrix + cross-stage invariants before tag. Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VWA_RAW_CODES,
  VWA_CHECK_ORDER,
  VWA_PUBLIC_CODES,
  VWA_AUDIT_CODES,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  VWA_PAID_SLOT,
  VWA_MINTED_SLOTS,
  VWA_RESERVED_SLOTS,
  VWA_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4z/constants.mjs";
import { verify } from "../../../../tools/simurgh-attestation/stage4z/node/verify-stage4z-attestation.mjs";
import { ceremony } from "../../../../tools/simurgh-attestation/stage4z/laneb/run-laneb-recompute-ceremony.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const index = JSON.parse(readFileSync(join(EVID, "index.json"), "utf8")).fixtures;

test("K7.1 — every fixture reaches its expected code at BOTH tiers (full tamper matrix)", () => {
  for (const tier of ["public", "audit"]) {
    const { ok, results } = verify({ tier });
    assert.ok(ok, `${tier}: ${JSON.stringify(results.filter((r) => !r.ok))}`);
  }
});

test("K7.2 — every raw code 190–198 appears in the fixture matrix or the wrapper", () => {
  const seen = new Set();
  for (const fx of index) {
    if (Number.isInteger(fx.expected_public)) seen.add(fx.expected_public);
    if (Number.isInteger(fx.expected_audit)) seen.add(fx.expected_audit);
  }
  // 190 (schema), 195 (audit-only) and 198 (wrapper) are exercised by unit tests, not fixtures.
  for (const c of [191, 192, 193, 194, 196, 197]) assert.ok(seen.has(c), `code ${c} in matrix`);
});

test("K7.3 — cross-stage invariant: VWA_PUBLIC_CODES ⊆ VWA_AUDIT_CODES; 195 is audit-only", () => {
  for (const c of VWA_PUBLIC_CODES) assert.ok(VWA_AUDIT_CODES.includes(c));
  assert.ok(!VWA_PUBLIC_CODES.includes(195));
  assert.ok(VWA_AUDIT_CODES.includes(195));
  assert.equal(VWA_CHECK_ORDER[VWA_CHECK_ORDER.length - 1], 197);
  assert.equal(VWA_RAW_CODES.INTERNAL_FAIL_CLOSED_VWA, 198);
});

test("K7.4 — ledger invariant: paid slot NOT reserved; three minted ARE reserved", () => {
  assert.ok(!VWA_RESERVED_SLOTS.includes(VWA_PAID_SLOT));
  assert.equal(VWA_MINTED_SLOTS.length, 3);
  for (const s of VWA_MINTED_SLOTS) assert.ok(VWA_RESERVED_SLOTS.includes(s));
});

test("K7.5 — Lane B blind ceremony passes with both blindness negatives", () => {
  const r = ceremony();
  assert.ok(r.ok, JSON.stringify(r));
});

test("K7.6 — honesty invariant: the non-claims include 'never model safe' and 'not faithfulness'", () => {
  assert.ok(VWA_NON_CLAIMS.some((c) => /never_model_safe/.test(c)));
  assert.ok(VWA_NON_CLAIMS.some((c) => /not_faithfulness/.test(c)));
  assert.ok(VWA_NON_CLAIMS.some((c) => /zero_flags_is_a_valid_outcome/.test(c)));
});
