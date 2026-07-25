// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — invention E: the incomparability census.
//
// The signed number is GENERATOR-DERIVED, never hand-carried. This test does not import an expected
// literal; it recomputes the counts by brute-force enumeration over the full vector space and by an
// independent closed form, then requires the generator to agree with both. Anti-gaming non-claim
// (owned by the census itself): incomparability density is NOT a security score.
import { test } from "node:test";
import assert from "node:assert/strict";
import { measureIncomparability } from "../../../../tools/simurgh-attestation/stage5p/node/measureIncomparability.mjs";
import {
  AXIS_VALUES,
  makeStrength,
  compareStrength,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";

function allVectors() {
  const out = [];
  for (const binding of AXIS_VALUES.binding)
    for (const resolution of AXIS_VALUES.resolution)
      for (const continuity of AXIS_VALUES.continuity)
        for (const role of AXIS_VALUES.role)
          out.push(makeStrength({ binding, resolution, continuity, role }));
  return out;
}

test("generator agrees with brute-force enumeration of the comparator", () => {
  const all = allVectors();
  let incomparableOrdered = 0;
  const byRelation = { equal: 0, strictly_below: 0, strictly_above: 0, incomparable: 0 };
  for (const a of all)
    for (const b of all) {
      const r = compareStrength(a, b);
      byRelation[r] += 1;
      if (r === "incomparable") incomparableOrdered += 1;
    }
  const m = measureIncomparability();
  assert.equal(m.vector_count, all.length);
  assert.equal(m.ordered_pairs, all.length * all.length);
  assert.deepEqual(m.by_relation, byRelation);
  assert.equal(m.incomparable_ordered_pairs, incomparableOrdered);
  assert.equal(m.incomparable_unordered_pairs, incomparableOrdered / 2);
});

test("generator agrees with the independent closed form for a product of chains", () => {
  // For chains of lengths n1..nk: |{(a,b): a<=b}| = PRODUCT ni*(ni+1)/2. Comparable ordered pairs
  // = 2*that - N (equal pairs are counted in both directions). Incomparable = N^2 - comparable.
  const lens = Object.values(AXIS_VALUES).map((v) => v.length);
  const N = lens.reduce((x, y) => x * y, 1);
  const leqPairs = lens.reduce((acc, n) => acc * ((n * (n + 1)) / 2), 1);
  const comparableOrdered = 2 * leqPairs - N;
  const m = measureIncomparability();
  assert.equal(m.vector_count, N);
  assert.equal(m.incomparable_ordered_pairs, N * N - comparableOrdered);
});

test("the census carries its anti-gaming non-claim and no density SCORE", () => {
  const m = measureIncomparability();
  assert.equal(m.non_claim, "incomparability_density_is_not_a_security_score");
  // A ratio invites ranking; the census publishes exact integers only.
  for (const [k, v] of Object.entries(m)) {
    if (typeof v === "number")
      assert.ok(Number.isInteger(v), `${k} must be an exact integer, got ${v}`);
  }
});

test("byte-stability: two runs serialise identically", () => {
  assert.equal(JSON.stringify(measureIncomparability()), JSON.stringify(measureIncomparability()));
});
