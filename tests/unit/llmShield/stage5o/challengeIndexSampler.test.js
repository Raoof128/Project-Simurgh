// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.2 — the frozen challenge-index rejection sampler (A25).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveChallengeIndices } from "../../../../tools/simurgh-attestation/stage5o/core/challengeIndexSampler.mjs";

const DRAW_DOMAIN = "simurgh.vsc.challenge_index_draw.v1";
const seed = (fill) => Buffer.alloc(32, fill);
const base = {
  seed: seed(0xab),
  universeSize: 65536,
  k: 128,
  drawCeiling: 4194304,
  drawDomain: DRAW_DOMAIN,
};

test("sampler: deterministic — same inputs give the same indices", () => {
  const a = deriveChallengeIndices(base);
  const b = deriveChallengeIndices(base);
  assert.deepEqual(a.indices, b.indices);
});

test("sampler: exactly k distinct in-range indices", () => {
  const { indices, sortedIndices } = deriveChallengeIndices(base);
  assert.equal(indices.length, 128);
  assert.equal(new Set(indices).size, 128, "all distinct");
  for (const i of indices) {
    assert.ok(Number.isSafeInteger(i) && i >= 0 && i < 65536, `index ${i} in range`);
  }
  assert.deepEqual(
    sortedIndices,
    [...indices].sort((x, y) => x - y)
  );
  assert.deepEqual(
    [...sortedIndices],
    [...new Set(sortedIndices)].sort((x, y) => x - y)
  );
});

test("sampler: a different seed gives a different sample", () => {
  const a = deriveChallengeIndices(base);
  const b = deriveChallengeIndices({ ...base, seed: seed(0xcd) });
  assert.notDeepEqual(a.sortedIndices, b.sortedIndices);
});

test("sampler: non-power-of-two N never yields candidate >= N (rejection works)", () => {
  const { indices } = deriveChallengeIndices({ ...base, universeSize: 3, k: 3 });
  assert.deepEqual([...indices].sort(), [0, 1, 2]);
});

test("sampler: N === 1 yields exactly index 0", () => {
  const { indices } = deriveChallengeIndices({ ...base, universeSize: 1, k: 1 });
  assert.deepEqual(indices, [0]);
});

test("sampler: draw ceiling exhaustion throws (cannot get 2 distinct from 1 draw)", () => {
  assert.throws(
    () => deriveChallengeIndices({ ...base, universeSize: 2, k: 2, drawCeiling: 1 }),
    /draw_ceiling_exhausted/
  );
});

test("sampler: rejects out-of-band k and N", () => {
  assert.throws(() => deriveChallengeIndices({ ...base, k: 0 }));
  assert.throws(() => deriveChallengeIndices({ ...base, universeSize: 0 }));
  assert.throws(() => deriveChallengeIndices({ ...base, k: 65537, universeSize: 65536 }));
});

test("sampler: known-answer vector (derived, then pinned)", () => {
  const { sortedIndices, drawsUsed } = deriveChallengeIndices({
    seed: seed(0xab),
    universeSize: 256,
    k: 8,
    drawCeiling: 4194304,
    drawDomain: DRAW_DOMAIN,
  });
  assert.equal(sortedIndices.length, 8);
  assert.deepEqual(sortedIndices, KAT_SORTED);
  assert.equal(drawsUsed, KAT_DRAWS);
});

// Filled from the derivation (a KAT cannot be written before the code produces it — like the maxima).
const KAT_SORTED = [6, 69, 78, 100, 121, 179, 211, 220];
const KAT_DRAWS = 9;
