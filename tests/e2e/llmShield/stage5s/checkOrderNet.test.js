// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 19 — the adjacent-pair first-failure net. AnthropicSafe First, then ReviewerSafe.
//
// REACHABILITY IS NOT AN ORDER, and Task 18 only proves reachability. Every one of its probes would
// still land if two untested checks swapped places, because each code remains reachable from
// somewhere — the sweep never asks which of two defects wins. A verifier could quietly reorder half
// its checks and pass the whole of Lane A. That gap is what this file closes (§13, B6).
//
// FOR EACH ADJACENT PAIR IN THE FROZEN BAND: a bundle defective at both must report the earlier.
// Thirty-seven pairs across thirty-eight codes, and five of them declared non-co-instantiable with
// the reason, because each is a real property of the system rather than a gap in the fixtures.
//
// TWO WAYS THIS NET COULD HAVE PASSED WHILE PROVING NOTHING, both found by running it:
//
//   COLLISION. Composing two probe damages usually destroys one — most target view A, and the second
//   rebuild overwrites the first. The composed bundle then holds ONE defect, reports it correctly,
//   and looks exactly like a pass. Every pair below therefore carries a SOLO assertion: the later
//   damage, applied alone, must reach the later code. Without it a collision is indistinguishable
//   from an ordering.
//
//   SHADOWING. Where both codes live in one short-circuiting module the later defect is real but
//   never evaluated — `tally` stops at the first group that refuses. That is still a valid ordering
//   witness, but "both codes appear in the failure list" is the wrong way to show it, and asserting
//   it would have forced the fixtures to lie about how the modules work.

import assert from "node:assert/strict";
import test from "node:test";

import {
  NON_COINSTANTIABLE_PAIRS,
  damageFor,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/cases.mjs";
import { baseBundle } from "../../../../tools/simurgh-attestation/stage5s/fixtures/bundle.mjs";
import { VWQ_CLOSED_BAND } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import {
  CHECK_ORDER,
  evaluate,
} from "../../../../tools/simurgh-attestation/stage5s/core/verify.mjs";

const BAND = VWQ_CLOSED_BAND.map((r) => r.raw_code);
const CHECK_OF = new Map(VWQ_CLOSED_BAND.map((r) => [r.raw_code, r.check_id]));

/** The 37 adjacent pairs of the frozen band, in band order. */
const ADJACENT = BAND.slice(0, -1).map((lo, i) => [lo, BAND[i + 1]]);

test("[5s-t19] the band yields exactly 37 adjacent pairs over 38 codes", () => {
  assert.equal(BAND.length, 38);
  assert.equal(ADJACENT.length, 37);
  // Band order must be ascending, or "adjacent" would mean nothing.
  for (const [lo, hi] of ADJACENT) assert.ok(hi === lo + 1, `${lo} and ${hi} are not adjacent`);
});

for (const [lo, hi] of ADJACENT) {
  const key = `${lo}/${hi}`;
  const reason = NON_COINSTANTIABLE_PAIRS[key];

  if (reason) {
    test(`[5s-t19] ${key} — declared non-co-instantiable, with a reason`, () => {
      // A declaration is only honest if it names a mechanism. "Not tested" is not a reason, and a
      // one-word exemption is how a gap becomes permanent.
      assert.ok(reason.length > 40, `${key}: the reason names no mechanism`);
      assert.ok(
        /exclusive|not reachable|no evaluator-side|not an ordered check|same —/.test(reason),
        `${key}: the reason does not say WHY the pair cannot exist`
      );
    });
    continue;
  }

  test(`[5s-t19] ${key} — defective at both, reports ${lo}`, () => {
    const damageLo = damageFor(lo, 0);
    const damageHi = damageFor(hi, 1);
    assert.ok(damageLo, `no damage for ${lo}`);
    assert.ok(damageHi, `no damage for ${hi}`);

    // SOLO — the later damage really does produce the later code. Without this the test cannot tell
    // an ordering from a collision that quietly deleted one of the two defects.
    const solo = evaluate(damageHi(baseBundle()));
    assert.equal(
      solo.first_failure?.raw_code,
      hi,
      `${key}: the later damage alone reaches ${solo.first_failure?.raw_code}, not ${hi}`
    );

    // BOTH — and the earlier code wins.
    const both = evaluate(damageLo(damageHi(baseBundle())));
    assert.equal(
      both.first_failure?.raw_code,
      lo,
      `${key}: a bundle defective at both reports ${both.first_failure?.raw_code} ` +
        `(${both.first_failure?.policy_outcome} — ${both.first_failure?.detail})`
    );
    // And the reported check is the one the frozen allocation assigns to that code.
    assert.equal(both.first_failure.check_id, CHECK_OF.get(lo), `${key}: wrong owning check`);
  });
}

// ------------------------------------------------------------------ the six spanning pairs, retained

test("[5s-t19] the six Task 16 spanning pairs still hold, as regression", () => {
  // Adjacent pairs test locality. These span whole checks, and they are kept because a reordering
  // that moved a check several positions could satisfy every adjacent pair it did not cross.
  const spans = [
    ["structural before checkpoint+producer", 475, 483],
    ["checkpoint+producer before witness policy", 479, 485],
    ["witness policy before witness identity", 485, 488],
    ["witness identity before laundering", 489, 491],
    ["laundering before quorum", 491, 496],
    ["quorum before comparison policy", 496, 498],
  ];
  for (const [label, lo, hi] of spans) {
    const solo = evaluate(damageFor(hi, 1)(baseBundle()));
    assert.equal(solo.first_failure?.raw_code, hi, `${label}: the later damage alone missed ${hi}`);

    const both = evaluate(damageFor(lo, 0)(damageFor(hi, 1)(baseBundle())));
    assert.equal(
      both.first_failure?.raw_code,
      lo,
      `${label}: reported ${both.first_failure?.raw_code}, expected ${lo}`
    );
  }
});

// ------------------------------------------------------------------ anti-vacuity

test("[5s-t19] every declared non-co-instantiable pair is a REAL adjacent pair", () => {
  // A stale declaration would exempt a pair that has since become constructible, and an exemption
  // nobody rechecks is the same failure as a skip nobody counts.
  const adjacentKeys = new Set(ADJACENT.map(([lo, hi]) => `${lo}/${hi}`));
  for (const key of Object.keys(NON_COINSTANTIABLE_PAIRS)) {
    assert.ok(adjacentKeys.has(key), `${key} is declared and is not an adjacent pair`);
  }
  // And the declaration must stay small. Five of thirty-seven is a fifth of the net; if it grows
  // much past that, the net has stopped being evidence and become a list of excuses.
  assert.ok(
    Object.keys(NON_COINSTANTIABLE_PAIRS).length <= 6,
    `${Object.keys(NON_COINSTANTIABLE_PAIRS).length} pairs are exempted`
  );
});

test("[5s-t19] the net covers every adjacent pair — none silently absent", () => {
  const constructible = ADJACENT.filter(([lo, hi]) => !NON_COINSTANTIABLE_PAIRS[`${lo}/${hi}`]);
  assert.equal(constructible.length + Object.keys(NON_COINSTANTIABLE_PAIRS).length, 37);
  for (const [lo, hi] of constructible) {
    assert.ok(damageFor(lo, 0), `${lo}/${hi}: no damage for the earlier code`);
    assert.ok(damageFor(hi, 1), `${lo}/${hi}: no damage for the later code`);
  }
});

test("[5s-t19] every check in the frozen order owns at least one pair in this net", () => {
  // Anti-vacuity against the shape of the net rather than its outcomes: a net that never exercised
  // a check could not detect that check moving.
  const exercised = new Set();
  for (const [lo, hi] of ADJACENT) {
    if (NON_COINSTANTIABLE_PAIRS[`${lo}/${hi}`]) continue;
    exercised.add(CHECK_OF.get(lo));
    exercised.add(CHECK_OF.get(hi));
  }
  // The claim gate and the wrapper sit outside: 511 pairs only with 510 and 512, and both of those
  // pairings are declared. They are covered by Task 18 instead.
  const expected = CHECK_ORDER.filter((c) => c !== "claim gate" && c !== "wrapper");
  assert.deepEqual([...exercised].sort(), [...expected].sort());
});
