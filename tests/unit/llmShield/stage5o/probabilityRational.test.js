// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.2 — the canonical rational object: PC-0 executed, never redefined.
//
// The lexical grammar is REFERENCED from §7's frozen registry (adding to that registry would flip
// the seventeen framed digests and trigger the A34 invalidation rule); positivity, lowest terms and
// the field-specific domains are §9 SEMANTIC rules. Every operation is exact integer arithmetic —
// "No Rounded Verdict" means no decision path may consult a float.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_UNSIGNED_DECIMAL_GRAMMAR_ID,
  isCanonicalUnsignedDecimal,
  parseRational,
  reduce,
  ratCompare,
  ratSub,
  ratIsZeroToOne,
  ratIsPositiveToOne,
  RATIONAL_KEYS,
} from "../../../../tools/simurgh-attestation/stage5o/core/probabilityRational.mjs";

const R = (n, d) => ({ numerator: n, denominator: d });

test("§9.2 references the FROZEN §7 grammar id rather than minting a new one", () => {
  assert.equal(
    CANONICAL_UNSIGNED_DECIMAL_GRAMMAR_ID,
    "simurgh.vsc.grammar.canonical_unsigned_decimal.v1"
  );
});

test("§9.2 lexical grammar ^(0|[1-9][0-9]*)$ accepts and rejects exactly", () => {
  for (const ok of ["0", "1", "9", "10", "250", "124700"]) {
    assert.equal(isCanonicalUnsignedDecimal(ok), true, ok);
  }
  for (const bad of ["", "00", "01", "-1", "+1", "1.0", "1e3", " 1", "1 ", "0x1", "١", "1_0"]) {
    assert.equal(isCanonicalUnsignedDecimal(bad), false, JSON.stringify(bad));
  }
});

test("§9.2 the rational is a TWO-key object; extra or missing keys reject", () => {
  assert.deepEqual([...RATIONAL_KEYS].sort(), ["denominator", "numerator"]);
  assert.throws(() => parseRational({ numerator: "1" }), /rational_exact_key_schema/);
  assert.throws(
    () => parseRational({ numerator: "1", denominator: "2", extra: "3" }),
    /rational_exact_key_schema/
  );
  assert.throws(() => parseRational(null), /rational_object/);
  assert.throws(() => parseRational("1/2"), /rational_object/);
});

test("§9.2 non-canonical decimals reject at the grammar, before any integer conversion", () => {
  assert.throws(() => parseRational(R("01", "2")), /rational_grammar/);
  assert.throws(() => parseRational(R("1", "-2")), /rational_grammar/);
  assert.throws(() => parseRational(R("1", "2.0")), /rational_grammar/);
  assert.throws(() => parseRational(R(1, 2)), /rational_grammar/); // numbers are not decimal strings
});

test("§9.2 denominator == 0 rejects (PC-0 positive denominator)", () => {
  assert.throws(() => parseRational(R("1", "0")), /rational_denominator_not_positive/);
});

test("§9.2 not-lowest-terms rejects: 2/4 and 1/2 are the same number, so one is canonical", () => {
  assert.throws(() => parseRational(R("2", "4")), /rational_not_lowest_terms/);
  assert.throws(() => parseRational(R("0", "5")), /rational_not_lowest_terms/); // 0 canonicalises to 0/1
  assert.deepEqual(parseRational(R("1", "2")), { n: 1n, d: 2n });
  assert.deepEqual(parseRational(R("0", "1")), { n: 0n, d: 1n });
});

test("§9.2 reduce() yields the UNIQUE canonical form, so every runtime emits the same bytes", () => {
  assert.deepEqual(reduce(2n, 4n), { n: 1n, d: 2n });
  assert.deepEqual(reduce(0n, 7n), { n: 0n, d: 1n });
  assert.deepEqual(reduce(9n, 3n), { n: 3n, d: 1n });
  assert.throws(() => reduce(1n, 0n), /zero_denominator/);
});

test("§9.2 comparison is exact cross-multiplication — never division, never a float", () => {
  // 1/3 vs 2/6 are equal; a float path (0.3333... vs 0.3333...) is not what decides this.
  assert.equal(ratCompare({ n: 1n, d: 3n }, { n: 2n, d: 6n }), 0);
  assert.equal(ratCompare({ n: 1n, d: 3n }, { n: 1n, d: 4n }), 1);
  assert.equal(ratCompare({ n: 1n, d: 4n }, { n: 1n, d: 3n }), -1);
  // A pair that IEEE-754 doubles cannot separate, but exact integers can.
  const a = { n: 10n ** 20n + 1n, d: 10n ** 20n };
  const b = { n: 10n ** 20n + 2n, d: 10n ** 20n };
  assert.equal(Number(a.n) / Number(a.d) === Number(b.n) / Number(b.d), true, "floats tie");
  assert.equal(ratCompare(a, b), -1, "exact integers separate them");
});

test("§9.2 subtraction is exact and returns lowest terms", () => {
  assert.deepEqual(ratSub({ n: 1n, d: 1n }, { n: 1n, d: 3n }), { n: 2n, d: 3n });
  assert.deepEqual(ratSub({ n: 1n, d: 1n }, { n: 1n, d: 1n }), { n: 0n, d: 1n });
});

test("§9.2 field-specific domains: f* is (0,1]; p_min and probabilities are [0,1]", () => {
  assert.equal(ratIsPositiveToOne({ n: 1n, d: 250n }), true);
  assert.equal(ratIsPositiveToOne({ n: 1n, d: 1n }), true);
  assert.equal(ratIsPositiveToOne({ n: 0n, d: 1n }), false, "f* = 0 must not pass");
  assert.equal(ratIsPositiveToOne({ n: 3n, d: 2n }), false, "f* > 1 must not pass");

  assert.equal(ratIsZeroToOne({ n: 0n, d: 1n }), true, "p_min = 0 is permitted");
  assert.equal(ratIsZeroToOne({ n: 1n, d: 1n }), true);
  assert.equal(ratIsZeroToOne({ n: 3n, d: 2n }), false);
});
