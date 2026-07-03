// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateMergeChain } from "../../../../tools/simurgh-attestation/stage4m/core/mergeLatticeCore.mjs";
import {
  breachedClusters,
  rescoreWindow,
} from "../../../../tools/simurgh-attestation/stage4m/core/retroScoreCore.mjs";

const D = (i) => `sha256:${i.toString(16).padStart(4, "0").repeat(16)}`;
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

function generateCase(seed) {
  const rnd = lcg(seed);
  const n = 3 + Math.floor(rnd() * 8); // 3..10 clusters
  const clusters = Array.from({ length: n }, (_, i) => ({
    cluster_commitment: D(i + 1),
    cluster_weighted_total: Math.floor(rnd() * 12),
    budget: 1 + Math.floor(rnd() * 8),
    cluster_size: 1 + Math.floor(rnd() * 3),
  }));
  // one merge bucket over a random slice of >=2 clusters, non-inflated budget by construction
  const k = 2 + Math.floor(rnd() * (n - 1));
  const merged = clusters.slice(0, k).map((c) => c.cluster_commitment);
  const minBudget = Math.min(...clusters.slice(0, k).map((c) => c.budget));
  const event = {
    schema: "simurgh.ccb.cluster_merge_event.v1",
    sequence: 1,
    parent_event_digest: null,
    old_graph_version_digest: D(900),
    new_graph_version_digest: D(901),
    merges: [
      {
        new_cluster_commitment: D(800),
        new_budget: Math.max(0, minBudget - Math.floor(rnd() * 2)),
        merged_cluster_commitments: merged,
        merge_basis: ["payment_graph"],
      },
    ],
    carried_cluster_commitments: clusters.slice(k).map((c) => c.cluster_commitment),
    raw_identity_exported: false,
  };
  const windowCommitment = {
    schema: "simurgh.vxd.window_commitment.v1",
    window: `2026-${String(1 + (seed % 12)).padStart(2, "0")}`,
    source_attestation_digest: D(700),
    graph_version_digest: D(900),
    clusters,
  };
  return { windowCommitment, event };
}

test("anti-monotonicity holds structurally on 200 seeded partition/merge cases", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { windowCommitment, event } = generateCase(seed);
    const chain = validateMergeChain([event], {
      graphVersionDigest: windowCommitment.graph_version_digest,
      clusters: windowCommitment.clusters.map((c) => c.cluster_commitment),
      budgets: Object.fromEntries(
        windowCommitment.clusters.map((c) => [c.cluster_commitment, c.budget])
      ),
    });
    assert.equal(chain.ok, true, `seed ${seed} chain`);
    const r = rescoreWindow({ windowCommitment, epoch: chain.epochs[0] });
    assert.equal(r.ok, true, `seed ${seed} rescore (budget non-inflated by construction)`);
    const before = breachedClusters(windowCommitment.clusters);
    for (const b of before) {
      const image = chain.epochs[0].imageMap.get(b);
      assert.ok(
        r.record.breached_after.includes(image),
        `seed ${seed}: breach ${b} must survive as ${image}`
      );
    }
    assert.equal(r.record.monotonicity_ok, true, `seed ${seed} predicate`);
  }
});

test("property suite is deterministic across two in-process runs", () => {
  const one = JSON.stringify(generateCase(42));
  const two = JSON.stringify(generateCase(42));
  assert.equal(one, two);
});
