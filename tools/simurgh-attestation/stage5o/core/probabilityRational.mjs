// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.2 — the canonical rational object. PC-0 executed, never redefined.
//
// The LEXICAL grammar is referenced from §7's frozen authority registry by id: adding a
// "positive decimal" grammar there would flip the seventeen framed registry digests and trigger the
// A34 invalidation rule, so positivity, lowest terms and the field-specific domains live here as §9
// SEMANTIC rules instead. That is the same lexical/semantic split the descriptors already declare.
//
// Every operation is exact integer arithmetic over BigInt. "No Rounded Verdict": no comparison that
// can reach a verdict may consult a floating-point value, so ordering is decided by cross
// multiplication rather than division.

/** The frozen §7 grammar this module REFERENCES (it does not restate or re-own the rule). */
export const CANONICAL_UNSIGNED_DECIMAL_GRAMMAR_ID =
  "simurgh.vsc.grammar.canonical_unsigned_decimal.v1";

const CANONICAL_UNSIGNED_DECIMAL = /^(0|[1-9][0-9]*)$/;

/** The exact two keys of a rational; anything else is a shape rejection. */
export const RATIONAL_KEYS = Object.freeze(["numerator", "denominator"]);

export function isCanonicalUnsignedDecimal(s) {
  return typeof s === "string" && CANONICAL_UNSIGNED_DECIMAL.test(s);
}

function gcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

/** The unique canonical form: lowest terms, positive denominator, 0 normalised to 0/1. */
export function reduce(n, d) {
  if (d === 0n) throw new Error("rational_zero_denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  if (n === 0n) return { n: 0n, d: 1n };
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/**
 * Validate a producer-supplied rational and return it as exact integers. The order is deliberate:
 * shape, then LEXICAL grammar, then integer conversion, then the semantic rules — a decimal string
 * is never converted to an integer before its length has been constrained by the caller's limits.
 */
export function parseRational(r) {
  if (r === null || typeof r !== "object" || Array.isArray(r))
    throw new TypeError("rational_object");
  const keys = Object.keys(r).sort();
  if (keys.length !== 2 || keys[0] !== "denominator" || keys[1] !== "numerator") {
    throw new Error("rational_exact_key_schema");
  }
  if (!isCanonicalUnsignedDecimal(r.numerator) || !isCanonicalUnsignedDecimal(r.denominator)) {
    throw new Error("rational_grammar");
  }
  const n = BigInt(r.numerator);
  const d = BigInt(r.denominator);
  if (d === 0n) throw new Error("rational_denominator_not_positive");
  if (gcd(n, d) !== 1n) {
    // 0/1 is the sole canonical encoding of zero; 0/5 shares gcd 5 and is therefore not lowest terms.
    throw new Error("rational_not_lowest_terms");
  }
  return { n, d };
}

/** Serialise exact integers back to the canonical two-key object. */
export function formatRational({ n, d }) {
  const r = reduce(n, d);
  return { numerator: r.n.toString(10), denominator: r.d.toString(10) };
}

/** Exact ordering by cross multiplication: -1, 0, or 1. Never division, never a float. */
export function ratCompare(a, b) {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l < r ? -1 : l > r ? 1 : 0;
}

export function ratEquals(a, b) {
  return ratCompare(a, b) === 0;
}

/** Exact subtraction, returned in lowest terms. */
export function ratSub(a, b) {
  return reduce(a.n * b.d - b.n * a.d, a.d * b.d);
}

const ZERO = { n: 0n, d: 1n };
const ONE = { n: 1n, d: 1n };

/** [0, 1] — the domain of p_min and of any computed probability. */
export function ratIsZeroToOne(r) {
  return ratCompare(r, ZERO) >= 0 && ratCompare(r, ONE) <= 0;
}

/** (0, 1] — the domain of the target fraction f*, which must not be zero. */
export function ratIsPositiveToOne(r) {
  return ratCompare(r, ZERO) > 0 && ratCompare(r, ONE) <= 0;
}
