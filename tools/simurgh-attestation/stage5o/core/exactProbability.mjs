// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.3/§9.4 — the exact evaluators and "No Unbounded Binomial".
//
// P_detect(N,J,k) = 1 - C(N-J,k)/C(N,k). The binomial ratio telescopes into two EQUAL products:
//
//   Q_k = prod_{i=0..k-1} (N-J-i)/(N-i)          Q_J = prod_{i=0..J-1} (N-k-i)/(N-i)
//
// They are exactly equal, so choosing between them is a RESOURCE decision, never a semantic one.
// Selecting m = min(J,k) collapses this stage's worst realistic case from ~293 ms and 153,459
// digits to microseconds. The tie at k == J is pinned to Q_k so two conforming implementations
// cannot disagree about which form ran (parity compares the chosen form, not only the value).
//
// "No Unbounded Binomial" means bounded EXACT ARITHMETIC, not merely a bounded loop: converting an
// untrusted decimal string to an integer is itself the sink, so operand digits are bounded before
// any BigInt conversion and intermediate width is bounded before any multiplication.
import { reduce, ratSub } from "./probabilityRational.mjs";

/**
 * Evaluation limits. These are §9-owned SEMANTIC/resource limits carried in the precommitted
 * probability policy — never new §7 lexical grammars. The defaults are the ceiling-derived values
 * the compatibility generator proves sufficient; a policy may only tighten them.
 */
export const DEFAULT_EVALUATION_LIMITS = Object.freeze({
  max_probability_decimal_digits: 64,
  max_probability_evaluation_terms: 65536,
  max_probability_intermediate_bits: 1 << 21,
});

const bitLength = (x) => (x < 0n ? -x : x).toString(2).length;

/** Bound a decimal numeral BEFORE it is converted to an integer — the conversion is the DoS sink. */
export function assertDecimalDigitsWithin(s, max) {
  if (typeof s !== "string") throw new TypeError("decimal_digits_input");
  if (s.length > max) throw new Error("probability_decimal_digits_exceeded");
  return true;
}

function guardBits(x, limits) {
  if (bitLength(x) > limits.max_probability_intermediate_bits) {
    throw new Error("probability_evaluation_intermediate_bits_exceeded");
  }
  return x;
}

/** Q_k = prod_{i=0..k-1} (N-J-i)/(N-i). Exposed so the identity census can compare both forms. */
export function productQk(N, J, k, limits = DEFAULT_EVALUATION_LIMITS) {
  let n = 1n;
  let d = 1n;
  for (let i = 0n; i < k; i++) {
    n = guardBits(n * (N - J - i), limits);
    d = guardBits(d * (N - i), limits);
  }
  return reduce(n, d);
}

/** Q_J = prod_{i=0..J-1} (N-k-i)/(N-i). Exactly equal to Q_k on the non-degenerate domain. */
export function productQJ(N, J, k, limits = DEFAULT_EVALUATION_LIMITS) {
  let n = 1n;
  let d = 1n;
  for (let i = 0n; i < J; i++) {
    n = guardBits(n * (N - k - i), limits);
    d = guardBits(d * (N - i), limits);
  }
  return reduce(n, d);
}

/**
 * P_detect(N,J,k) as an exact reduced rational, with the chosen form and term count reported so
 * cross-runtime parity can compare the RESOURCE decision as well as the value.
 */
export function pDetect(N, J, k, limits = DEFAULT_EVALUATION_LIMITS) {
  // 1. degenerate comparison first: C(N-J,k) = 0, so P = 1 exactly with zero product work. This
  //    precedes the term bound because it performs no arithmetic to bound.
  if (N - J < k) return { value: { n: 1n, d: 1n }, form: "degenerate", terms: 0 };

  // 2. choose m = min(J,k); the tie k == J is pinned to Q_k.
  const useQk = k <= J;
  const m = useQk ? k : J;

  // 3. verify the term bound BEFORE evaluating.
  if (m > BigInt(limits.max_probability_evaluation_terms)) {
    throw new Error("probability_evaluation_terms_exceeded");
  }

  // 4/5. evaluate under the intermediate-width guard.
  const Q = useQk ? productQk(N, J, k, limits) : productQJ(N, J, k, limits);
  return { value: ratSub({ n: 1n, d: 1n }, Q), form: useQk ? "Q_k" : "Q_J", terms: Number(m) };
}

/** PC-3: P_pair(N,k) = k(k-1)/(N(N-1)), exact and reduced. Callers must check activation first. */
export function pPair(N, k) {
  return reduce(k * (k - 1n), N * (N - 1n));
}

/**
 * PC-3 activation. A smaller N or k does NOT invalidate the detection claim and is NOT a domain
 * violation — it makes the pair-ratio field inactive, and a field that cannot be computed must not
 * be emitted (§9.8 check 12 owns that, never check 9).
 */
export function pairRatioActive(N, k) {
  return N >= 2n && k >= 2n;
}

/** J* = ceil(f* x N) = floor((aN + b - 1)/b) for f* = a/b. Exact integer arithmetic throughout. */
export function jStarFromFraction(f, N) {
  return (f.n * N + f.d - 1n) / f.d;
}
