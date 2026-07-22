// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.3/§9.4 — the exact evaluators and "No Unbounded Binomial".
//
// Every value is an exact rational. The two product identities are equal by construction, so form
// selection is a RESOURCE decision and never a semantic one; the tie at k == J is pinned to Q_k so
// two conforming implementations cannot disagree about which form ran.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pDetect,
  pPair,
  pairRatioActive,
  jStarFromFraction,
  productQk,
  productQJ,
  assertDecimalDigitsWithin,
  DEFAULT_EVALUATION_LIMITS,
} from "../../../../tools/simurgh-attestation/stage5o/core/exactProbability.mjs";

const L = DEFAULT_EVALUATION_LIMITS;
const rat = (n, d) => ({ n: BigInt(n), d: BigInt(d) });

test("§9.3 the two product identities are EXACTLY equal on every non-degenerate case", () => {
  const grid = [
    [1247, 5, 30],
    [12470, 5, 30],
    [62350, 5, 30],
    [65536, 5, 128],
    [100, 7, 13],
    [65536, 499, 30],
    [50, 10, 20],
    [9, 3, 4],
    [65536, 1, 1],
    [2, 1, 1],
  ];
  for (const [N, J, k] of grid) {
    if (N - J < k) continue; // degenerate, no product
    const a = productQk(BigInt(N), BigInt(J), BigInt(k));
    const b = productQJ(BigInt(N), BigInt(J), BigInt(k));
    assert.deepEqual(a, b, `Q_k != Q_J at N=${N} J=${J} k=${k}`);
  }
});

test("§9.3 degenerate branch N-J<k yields exactly 1/1 with ZERO product terms", () => {
  const r = pDetect(65536n, 65536n, 1n, L);
  assert.deepEqual(r.value, { n: 1n, d: 1n });
  assert.equal(r.terms, 0);
  assert.equal(r.form, "degenerate");
  // The pathological k=65535 case that cost 1.1s naively is degenerate and costs nothing.
  const r2 = pDetect(65536n, 5n, 65535n, L);
  assert.equal(r2.form, "degenerate");
  assert.deepEqual(r2.value, { n: 1n, d: 1n });
});

test("§9.3 form selection uses m = min(J,k) and pins the k == J tie to Q_k", () => {
  assert.equal(pDetect(1000n, 500n, 7n, L).form, "Q_k", "k <= J -> Q_k (k terms)");
  assert.equal(pDetect(1000n, 7n, 500n, L).form, "Q_J", "J < k -> Q_J (J terms)");
  assert.equal(pDetect(1000n, 500n, 7n, L).terms, 7);
  assert.equal(pDetect(1000n, 7n, 500n, L).terms, 7);
  const tie = pDetect(1000n, 9n, 9n, L);
  assert.equal(tie.form, "Q_k", "k == J is pinned to Q_k");
  assert.equal(tie.terms, 9);
});

test("§9.3 reproduces the FROZEN §2 T3.5 dilution figures as exact rationals", () => {
  // §2 prints correctly-rounded decimals; these are the exact rationals behind them.
  assert.deepEqual(pDetect(1247n, 5n, 30n, L).value, rat("2861928357751", "24926661161479"));
  assert.deepEqual(
    pDetect(12470n, 5n, 30n, L).value,
    rat("2147233042031429", "179338970490884321")
  );
  assert.deepEqual(
    pDetect(62350n, 5n, 30n, L).value,
    rat("3145074447213468251", "1308519312143973924995")
  );
});

test("§9.3 J* = ceil(f* x N) is exact integer arithmetic (verified against §2's worked values)", () => {
  assert.equal(jStarFromFraction(rat(1, 250), 1247n), 5n);
  assert.equal(jStarFromFraction(rat(1, 250), 124700n), 499n);
  assert.equal(jStarFromFraction(rat(1, 1), 10n), 10n, "f* = 1 -> J* = N");
  // exact boundary behaviour: 1000/250 = 4 exactly, so no rounding up
  assert.equal(jStarFromFraction(rat(1, 250), 1000n), 4n);
  assert.equal(jStarFromFraction(rat(1, 250), 1001n), 5n, "one over the boundary rounds up");
});

test("§9.3 P_pair and its ACTIVATION rule (PC-3): inactive is not a domain violation", () => {
  assert.deepEqual(pPair(1247n, 30n), rat(15, 26789));
  assert.equal(pairRatioActive(1247n, 30n), true);
  assert.equal(pairRatioActive(1247n, 1n), false, "k < 2 -> inactive");
  assert.equal(pairRatioActive(1n, 30n), false, "N < 2 -> inactive");
  assert.equal(pairRatioActive(2n, 2n), true, "the exact activation boundary");
  assert.deepEqual(pPair(2n, 2n), rat(1, 1));
});

test("§9.4 bounded exact arithmetic: the TERM bound rejects before evaluation", () => {
  const tight = { ...L, max_probability_evaluation_terms: 4 };
  assert.throws(() => pDetect(65536n, 100n, 100n, tight), /evaluation_terms_exceeded/);
  // the degenerate branch is a comparison and is NOT subject to the term bound
  assert.deepEqual(pDetect(10n, 10n, 5n, tight).value, { n: 1n, d: 1n });
});

test("§9.4 bounded exact arithmetic: the INTERMEDIATE-WIDTH bound rejects huge operands", () => {
  const narrow = { ...L, max_probability_intermediate_bits: 32 };
  assert.throws(() => pDetect(65536n, 5n, 128n, narrow), /evaluation_intermediate_bits_exceeded/);
});

test("§9.4 decimal digits are bounded BEFORE integer conversion (the real DoS sink)", () => {
  assert.equal(assertDecimalDigitsWithin("12345", 5), true);
  assert.throws(() => assertDecimalDigitsWithin("123456", 5), /decimal_digits_exceeded/);
  // A megabyte-long numeral must never reach BigInt() to be judged too long.
  const huge = "9".repeat(1_000_000);
  assert.throws(() => assertDecimalDigitsWithin(huge, 64), /decimal_digits_exceeded/);
});
