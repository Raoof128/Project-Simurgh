// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.9 — the generated §9 censuses.
//
// Every count here is DERIVED. This stage's repeated lesson is that a census maintained by hand does
// not track a class, it records the last time someone remembered to look — so nothing below asserts
// a literal it did not first compute.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SECTION9_CHECK_IDS,
  SECTION9_FIRST_FAILURE_ORDER,
  verifySection9Relation,
} from "../../../../tools/simurgh-attestation/stage5o/core/section9Verifier.mjs";
import {
  productQk,
  productQJ,
  pDetect,
  jStarFromFraction,
  DEFAULT_EVALUATION_LIMITS as L,
} from "../../../../tools/simurgh-attestation/stage5o/core/exactProbability.mjs";
import {
  reduce,
  formatRational,
} from "../../../../tools/simurgh-attestation/stage5o/core/probabilityRational.mjs";
import {
  measureProbabilityCompatibility,
  probabilityCompatibilityInvariantHolds,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureProbabilityCompatibility.mjs";
import { makeSection9Fixture, canonicalJson } from "./section9Fixture.mjs";

test("census: the check-identifier catalogue and the first-failure order are parallel and unique", () => {
  assert.equal(SECTION9_CHECK_IDS.length, SECTION9_FIRST_FAILURE_ORDER.length);
  assert.equal(new Set(SECTION9_CHECK_IDS).size, SECTION9_CHECK_IDS.length, "duplicate check id");
  assert.equal(
    new Set(SECTION9_FIRST_FAILURE_ORDER).size,
    SECTION9_FIRST_FAILURE_ORDER.length,
    "duplicate reason"
  );
  for (const id of SECTION9_CHECK_IDS) assert.match(id, /^s9_check\.[a-z0-9_]+$/);
  for (const r of SECTION9_FIRST_FAILURE_ORDER) assert.match(r, /^s9_[a-z0-9_]+$/);
});

test("census: the DUAL-FORM identity holds over a generated grid (oracle-free, no expected value)", () => {
  const sizes = [1, 2, 3, 4, 7, 8, 9, 16, 17, 100, 256, 257, 1024, 1247, 4096];
  const grid = [];
  for (const N of sizes) {
    for (const k of [1, 2, 3, N - 1, N, Math.max(1, N >> 1)]) {
      for (const J of [1, 2, N - 1, N, Math.max(1, N >> 2)]) {
        if (k < 1 || k > N || J < 1 || J > N) continue;
        grid.push([N, J, k]);
      }
    }
  }
  let degenerate = 0;
  let compared = 0;
  for (const [N, J, k] of grid) {
    const Nb = BigInt(N);
    const Jb = BigInt(J);
    const kb = BigInt(k);
    if (Nb - Jb < kb) {
      // the degenerate branch: P is exactly 1 with zero product work
      const r = pDetect(Nb, Jb, kb, L);
      assert.deepEqual(r.value, { n: 1n, d: 1n });
      assert.equal(r.terms, 0);
      degenerate++;
      continue;
    }
    assert.deepEqual(
      productQk(Nb, Jb, kb, L),
      productQJ(Nb, Jb, kb, L),
      `Q_k != Q_J at N=${N} J=${J} k=${k}`
    );
    // the evaluator must select min(J,k) terms and pin the k == J tie to Q_k
    const r = pDetect(Nb, Jb, kb, L);
    assert.equal(r.terms, Math.min(J, k), `term count at N=${N} J=${J} k=${k}`);
    assert.equal(r.form, k <= J ? "Q_k" : "Q_J");
    compared++;
  }
  // counts are reported, never targeted
  assert.ok(
    compared > 0 && degenerate > 0,
    `grid ${grid.length}: ${compared} compared, ${degenerate} degenerate`
  );
  assert.equal(compared + degenerate, grid.length);
});

test("census: J* = ceil(f* x N) around exact integer boundaries", () => {
  const f = { n: 1n, d: 250n };
  assert.equal(jStarFromFraction(f, 999n), 4n, "just below the boundary");
  assert.equal(jStarFromFraction(f, 1000n), 4n, "exactly on it, no spurious round-up");
  assert.equal(jStarFromFraction(f, 1001n), 5n, "just above");
});

test("census: the compatibility invariant BOUNDS every intermediate operand (derived)", () => {
  const m = measureProbabilityCompatibility();
  assert.equal(probabilityCompatibilityInvariantHolds(), true);
  assert.equal(m.bounded, true);
  // the derivation itself, recomputed here rather than copied
  assert.equal(m.derived.product_bits, m.derived.m_ceiling * m.ceilings.n_bits);
  assert.equal(m.derived.cross_multiply_bits, m.derived.product_bits + m.derived.p_min_bits);
  assert.equal(
    m.derived.widest_intermediate_bits <= m.limits.max_probability_intermediate_bits,
    true
  );
  assert.ok(m.headroom_bits > 0, `headroom ${m.headroom_bits}`);
  // a ceiling too small must FAIL the invariant — the generator decides, it does not rubber-stamp
  assert.equal(
    probabilityCompatibilityInvariantHolds({
      ...DEFAULT_LIMITS_CLONE(),
      max_probability_intermediate_bits: 1024,
    }),
    false
  );
});

function DEFAULT_LIMITS_CLONE() {
  return { ...L };
}

test("census: the floor is INCLUSIVE at equality and rejects one unit above", () => {
  const base = makeSection9Fixture();
  const P = base.detect.value;

  // p_min exactly equal to the computed probability must ACCEPT (>= is inclusive)
  const eq = makeSection9Fixture({
    policyOverride: { minimum_detection_bound: formatRational(P) },
  });
  assert.equal(verifySection9Relation(eq.authority, eq.raw).accept, true, "equality must accept");

  // the smallest constructible increase must REJECT
  const above = formatRational(reduce(P.n + 1n, P.d));
  const hi = makeSection9Fixture({ policyOverride: { minimum_detection_bound: above } });
  const v = verifySection9Relation(hi.authority, hi.raw);
  assert.equal(v.accept, false);
  assert.equal(v.reason, "s9_detection_floor_unmet");
  assert.equal(v.check, 15);
});

test("census: a fraction-basis policy verifies end to end", () => {
  const f = makeSection9Fixture({
    N: 256,
    k: 8,
    basis: {
      target_defect_basis: "fraction",
      target_defect_fraction: { numerator: "1", denominator: "50" },
    },
    policyOverride: { minimum_detection_bound: { numerator: "1", denominator: "100" } },
  });
  assert.equal(f.jStar, 6n, "ceil(256/50) = 6");
  const v = verifySection9Relation(f.authority, f.raw);
  assert.equal(v.accept, true, JSON.stringify(v));
  // and the claim really did carry the computed number
  assert.equal(
    canonicalJson(f.claim.detection_probability),
    canonicalJson(formatRational(f.detect.value))
  );
});
