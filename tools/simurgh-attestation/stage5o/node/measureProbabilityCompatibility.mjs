// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.4 — the probability-evaluation compatibility generator (oracle-free).
//
// "No Unbounded Binomial" is a claim about EXACT ARITHMETIC, not about loop iterations. This
// generator derives — never asserts — the worst-case intermediate operand width reachable under the
// stage's frozen N and k ceilings together with the §9 policy limits, and reports whether the
// declared intermediate-bit ceiling bounds every multiplication and cross-multiplication.
//
// It targets no expected value. The numbers below are computed from the ceilings; if a ceiling
// moves, the measurement moves with it and the invariant is re-decided.
import { MAX_SELECTED_INDICES_V1 } from "../core/constants.mjs";
import { DEFAULT_EVALUATION_LIMITS } from "../core/exactProbability.mjs";

const bitLen = (n) => BigInt(n).toString(2).length;

/**
 * Worst-case widths for one P_detect evaluation.
 *
 * Each of the m factors is a positive integer strictly below N, so a product of m of them is bounded
 * by N^m and its width by m * bitLength(N). Both numerator and denominator accumulate m factors, so
 * the widest intermediate is that same bound. The final floor comparison cross-multiplies the
 * reduced probability against p_min, whose operands are bounded by the policy's decimal-digit limit.
 */
export function measureProbabilityCompatibility(limits = DEFAULT_EVALUATION_LIMITS) {
  const N = MAX_SELECTED_INDICES_V1; // == MAX_SCOPE_CARDINALITY (constants.mjs)
  const k = MAX_SELECTED_INDICES_V1;
  const nBits = bitLen(N);
  const kBits = bitLen(k);

  // m is bounded twice: by the policy term limit and, structurally, by min(J,k) <= N.
  const mCeiling = Math.min(limits.max_probability_evaluation_terms, N);
  const productBits = mCeiling * nBits;

  // p_min operands are bounded by the decimal-digit limit; log2(10) < 3.322.
  const pMinBits = Math.ceil(limits.max_probability_decimal_digits * 3.322);
  // The floor comparison multiplies a reduced probability operand by a p_min operand.
  const crossMultiplyBits = productBits + pMinBits;
  const widest = Math.max(productBits, crossMultiplyBits);

  return {
    ceilings: { N, k, n_bits: nBits, k_bits: kBits },
    limits: {
      max_probability_evaluation_terms: limits.max_probability_evaluation_terms,
      max_probability_decimal_digits: limits.max_probability_decimal_digits,
      max_probability_intermediate_bits: limits.max_probability_intermediate_bits,
    },
    derived: {
      m_ceiling: mCeiling,
      product_bits: productBits,
      p_min_bits: pMinBits,
      cross_multiply_bits: crossMultiplyBits,
      widest_intermediate_bits: widest,
    },
    // The invariant: the declared ceiling bounds every intermediate this evaluation can reach.
    bounded: widest <= limits.max_probability_intermediate_bits,
    headroom_bits: limits.max_probability_intermediate_bits - widest,
  };
}

/** True when the declared intermediate-bit ceiling bounds every reachable intermediate operand. */
export function probabilityCompatibilityInvariantHolds(limits = DEFAULT_EVALUATION_LIMITS) {
  return measureProbabilityCompatibility(limits).bounded;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  console.log(JSON.stringify(measureProbabilityCompatibility(), null, 2));
}
