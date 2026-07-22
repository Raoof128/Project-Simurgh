// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §10 — the exit-ledger parity census (additive band 420-456).
//
// Every clause here is GENERATED from the frozen §7/§8/§9 first-failure orders. A24's obligation is
// one code per SEMANTIC CLASS, never one per fixture — §8 carries 18 fixture rows against 11 reasons
// and §9 carries 21 against 15, so numbering reasons is what discharges it.
//
// The wrapper is deliberately NOT a Stage 5O code: all three frozen sections return the shared
// RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED (29) and that wiring is frozen, so minting a 5O
// wrapper would force A34, A35 and A36 refreezes to renumber an internal error.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VSC_RAW_CODES,
  VSC_CHECK_ORDER,
  VSC_WRAPPER,
  VSC_BANDS,
  VSC_RESERVED_FROM,
  rawCodeForVscReason,
  vscReasonForRawCode,
  RUN_LEVEL_BY_RAW,
  RAW_VERIFIER_CODES,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { SECTION7_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs";
import { SECTION8_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import { SECTION9_FIRST_FAILURE_ORDER } from "../../../../tools/simurgh-attestation/stage5o/core/section9Verifier.mjs";

const FROZEN = [
  ["s7", SECTION7_FIRST_FAILURE_ORDER, 420, 430],
  ["s8", SECTION8_FIRST_FAILURE_ORDER, 431, 441],
  ["s9", SECTION9_FIRST_FAILURE_ORDER, 442, 456],
];
const ALL_REASONS = FROZEN.flatMap(([, order]) => [...order]);

test("§10.2 every frozen reason has exactly one code, and the count is DERIVED", () => {
  assert.equal(ALL_REASONS.length, 37, "the three frozen orders must total 37 reasons");
  for (const r of ALL_REASONS) {
    const code = rawCodeForVscReason(r);
    assert.equal(typeof code, "number", `${r} has no code`);
    assert.notEqual(code, 0, `${r} must never map to 0 — 0 is OK, never a rejection`);
  }
  assert.equal(new Set(ALL_REASONS.map(rawCodeForVscReason)).size, ALL_REASONS.length);
});

test("§10.2 every allocated code has exactly one reason (no incompatible meanings)", () => {
  const codes = Object.values(VSC_RAW_CODES).filter((c) => c !== 0);
  assert.equal(codes.length, 37);
  assert.equal(new Set(codes).size, 37, "duplicate code");
  for (const c of codes) {
    const r = vscReasonForRawCode(c);
    assert.ok(ALL_REASONS.includes(r), `code ${c} maps to unknown reason ${r}`);
    assert.equal(rawCodeForVscReason(r), c, "the mapping must be a bijection");
  }
});

test("§10.2 sub-bands are contiguous, disjoint, and numeric order IS the first-failure order", () => {
  for (const [tag, order, lo, hi] of FROZEN) {
    assert.equal(order.length, hi - lo + 1, `${tag} band width must match its reason count`);
    const codes = order.map(rawCodeForVscReason);
    // numeric order must equal the frozen first-failure order, position for position
    assert.deepEqual(
      codes,
      Array.from({ length: order.length }, (_, i) => lo + i),
      `${tag}: numeric order must equal the frozen first-failure order`
    );
    assert.deepEqual(VSC_BANDS[tag], { lo, hi });
  }
  // disjoint across sections
  const all = FROZEN.flatMap(([, order]) => order.map(rawCodeForVscReason));
  assert.equal(new Set(all).size, all.length);
  assert.equal(Math.min(...all), 420);
  assert.equal(Math.max(...all), 456);
});

test("§10.2 VSC_CHECK_ORDER is the whole spine, 420..456 in numeric order", () => {
  assert.deepEqual(
    VSC_CHECK_ORDER,
    Array.from({ length: 37 }, (_, i) => 420 + i)
  );
  assert.ok(!VSC_CHECK_ORDER.includes(0), "0 is OK and is not a predicate");
});

test("§10.3 the wrapper is the SHARED 29, not a Stage 5O code", () => {
  assert.equal(VSC_WRAPPER, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED);
  assert.equal(VSC_WRAPPER, 29);
  assert.ok(!VSC_CHECK_ORDER.includes(VSC_WRAPPER), "the wrapper is a boundary, not a predicate");
  assert.ok(VSC_WRAPPER < 420, "the wrapper deliberately sits outside the 5O band");
});

test("§10.4 every allocated code has a run level, and the band is uniformly level 1", () => {
  for (let c = 420; c <= 456; c++) {
    assert.ok(Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, c), `${c} has no run level`);
    assert.equal(RUN_LEVEL_BY_RAW[c], 1, `${c} must be run level 1`);
  }
});

test("§10.2 the reserved boundary for §12 is declared and empty", () => {
  assert.equal(VSC_RESERVED_FROM, 457);
  const allocated = Object.values(VSC_RAW_CODES).filter((c) => c !== 0);
  for (const c of allocated) assert.ok(c < VSC_RESERVED_FROM, `${c} intrudes on the §12 reserve`);
  assert.ok(
    !Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, 457),
    "457+ must stay unallocated until §12 is designed"
  );
});

test("§10.5 prior-stage codes did not move: 0..419 is untouched and complete as before", () => {
  // The ledger is additive only. Every key below 420 must still be present with its prior value.
  // Spot-anchors across the whole prior history, from the oldest verifier codes to Stage 5N's tail.
  const anchors = {
    0: 0,
    19: 1,
    28: 2,
    29: 3,
    396: 1,
    419: 1,
  };
  for (const [k, v] of Object.entries(anchors)) {
    assert.equal(RUN_LEVEL_BY_RAW[k], v, `prior code ${k} moved`);
  }
  const below = Object.keys(RUN_LEVEL_BY_RAW)
    .map(Number)
    .filter((n) => n < 420);
  assert.equal(below.length, 401, "the 401 pre-existing ledger entries must be unchanged in count");
});

test("§10.1 one code per SEMANTIC CLASS, never one per fixture", () => {
  // The reason set is the semantic-class set; fixtures outnumber reasons in both §8 and §9.
  assert.ok(SECTION8_FIRST_FAILURE_ORDER.length < 18, "§8: 18 fixture rows, fewer reasons");
  assert.ok(SECTION9_FIRST_FAILURE_ORDER.length < 21, "§9: 21 fixture rows, fewer reasons");
  assert.equal(Object.values(VSC_RAW_CODES).filter((c) => c !== 0).length, ALL_REASONS.length);
});

test("§10 an unknown reason has no code, and an out-of-band code has no reason", () => {
  assert.equal(rawCodeForVscReason("s9_not_a_real_reason"), undefined);
  assert.equal(vscReasonForRawCode(419), undefined, "419 belongs to Stage 5N");
  assert.equal(vscReasonForRawCode(457), undefined, "457 is reserved, not allocated");
  assert.equal(vscReasonForRawCode(29), undefined, "the shared wrapper is not a 5O reason");
});
