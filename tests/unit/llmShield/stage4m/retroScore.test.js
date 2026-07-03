// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { validateMergeChain } from "../../../../tools/simurgh-attestation/stage4m/core/mergeLatticeCore.mjs";
import {
  breachedClusters,
  rescoreAll,
  rescoreWindow,
  verifyRescoreRecord,
} from "../../../../tools/simurgh-attestation/stage4m/core/retroScoreCore.mjs";

const D = (n) => `sha256:${String(n).repeat(64)}`;
const CA = D("a"),
  CB = D("b"),
  CC = D("c"),
  CNEW = D("d");

// V-CROWN shape in miniature: three singletons, each under its budget of 5,
// merged under a non-inflated budget of 5 -> combined 9 > 5, revealed retroactively.
const windowCommitment = {
  schema: "simurgh.vxd.window_commitment.v1",
  window: "2026-05",
  source_attestation_digest: D("1"),
  graph_version_digest: D("e"),
  clusters: [
    { cluster_commitment: CA, cluster_weighted_total: 3, budget: 5, cluster_size: 1 },
    { cluster_commitment: CB, cluster_weighted_total: 3, budget: 5, cluster_size: 1 },
    { cluster_commitment: CC, cluster_weighted_total: 3, budget: 5, cluster_size: 1 },
  ],
};
const mergeEvent = {
  schema: "simurgh.ccb.cluster_merge_event.v1",
  sequence: 1,
  parent_event_digest: null,
  old_graph_version_digest: D("e"),
  new_graph_version_digest: D("f"),
  merges: [
    {
      new_cluster_commitment: CNEW,
      new_budget: 5,
      merged_cluster_commitments: [CA, CB, CC],
      merge_basis: ["payment_graph"],
    },
  ],
  carried_cluster_commitments: [],
  raw_identity_exported: false,
};
const genesis = () => ({
  graphVersionDigest: D("e"),
  clusters: [CA, CB, CC],
  budgets: { [CA]: 5, [CB]: 5, [CC]: 5 },
});
const epoch = () => validateMergeChain([mergeEvent], genesis()).epochs[0];

test("V-CROWN in miniature: merge reveals the retroactive breach + cardinality contradiction", () => {
  const r = rescoreWindow({ windowCommitment, epoch: epoch() });
  assert.equal(r.ok, true);
  assert.equal(r.record.schema, "simurgh.vxd.retro_rescore.v1");
  assert.equal(r.record.window, "2026-05");
  assert.equal(r.record.merge_event_digest, recordDigest(mergeEvent));
  assert.deepEqual(r.record.breached_before, []);
  assert.deepEqual(r.record.breached_after, [CNEW]);
  assert.deepEqual(r.record.newly_revealed, [CNEW]);
  assert.equal(r.record.monotonicity_ok, true);
  assert.deepEqual(r.record.findings, [
    `singleton_merge_contradiction:${recordDigest(windowCommitment)}`,
  ]);
});

test("V15 no-merge control: no epochs, no records, nothing revealed", () => {
  const r = rescoreAll({ windows: [windowCommitment], epochs: [] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.records, []);
});

// V3 (budget inflation) is caught upstream in Task 3's validateMergeChain (an inflationary
// merge never produces a valid epoch), so rescoreWindow does not re-litigate it. Here we only
// confirm the non-inflated V-CROWN epoch re-scores cleanly (positive control).
test("non-inflated epoch re-scores without error (inflation is a Task-3 concern)", () => {
  assert.equal(rescoreWindow({ windowCommitment, epoch: epoch() }).ok, true);
});

test("already-breached cluster stays breached through a merge (image-mapped)", () => {
  const w = {
    ...windowCommitment,
    clusters: [
      { cluster_commitment: CA, cluster_weighted_total: 9, budget: 5, cluster_size: 2 },
      { cluster_commitment: CB, cluster_weighted_total: 1, budget: 5, cluster_size: 1 },
      { cluster_commitment: CC, cluster_weighted_total: 1, budget: 5, cluster_size: 1 },
    ],
  };
  assert.deepEqual(breachedClusters(w.clusters), [CA]);
  const r = rescoreWindow({ windowCommitment: w, epoch: epoch() });
  assert.equal(r.ok, true);
  assert.deepEqual(r.record.breached_before, [CA]);
  assert.deepEqual(r.record.breached_after, [CNEW]);
  assert.deepEqual(r.record.newly_revealed, []); // image(CA)=CNEW already accounts for it
  // CB and CC are BOTH cluster_size 1 -> two singletons in the merged bucket -> contradiction fires
  assert.deepEqual(r.record.findings, [`singleton_merge_contradiction:${recordDigest(w)}`]);
});

test("V5 verify: committed breach whose image vanished from recomputed after-set -> 44", () => {
  const clean = rescoreWindow({ windowCommitment, epoch: epoch() }).record;
  const committed = { ...clean, breached_before: [CA] }; // claims CA breached before
  const recomputedTampered = { ...clean, breached_after: [] }; // tampered ledger un-breached it
  const v = verifyRescoreRecord({ committed, recomputed: recomputedTampered, epoch: epoch() });
  assert.equal(v.ok, false);
  assert.equal(v.rawCode, 44);
  assert.equal(v.reason, "anti_monotonicity_violation");
  assert.deepEqual(v.offending, {
    window: "2026-05",
    old_cluster_commitment: CA,
    image_commitment: CNEW,
  });
  // and the clean pair verifies
  assert.equal(
    verifyRescoreRecord({ committed: clean, recomputed: clean, epoch: epoch() }).ok,
    true
  );
});

test("multi-epoch fold: breach survives A+B->AB then AB+C->ABC across two epochs", () => {
  const CAB = D("2");
  const CABC = D("3");
  const e1 = {
    schema: "simurgh.ccb.cluster_merge_event.v1",
    sequence: 1,
    parent_event_digest: null,
    old_graph_version_digest: D("e"),
    new_graph_version_digest: D("f"),
    merges: [
      {
        new_cluster_commitment: CAB,
        new_budget: 5,
        merged_cluster_commitments: [CA, CB],
        merge_basis: ["payment_graph"],
      },
    ],
    carried_cluster_commitments: [CC],
    raw_identity_exported: false,
  };
  const e2 = {
    ...e1,
    sequence: 2,
    parent_event_digest: recordDigest(e1),
    old_graph_version_digest: D("f"),
    new_graph_version_digest: D("1"),
    merges: [
      {
        new_cluster_commitment: CABC,
        new_budget: 5,
        merged_cluster_commitments: [CAB, CC],
        merge_basis: ["payment_graph"],
      },
    ],
    carried_cluster_commitments: [],
  };
  // window: A=3, B=3, C=3, all budget 5 -> AB=6 breached after epoch 1, ABC=9 after epoch 2
  const window = { ...windowCommitment };
  const chain = validateMergeChain([e1, e2], genesis());
  assert.equal(chain.ok, true);
  const out = rescoreAll({ windows: [window], epochs: chain.epochs });
  assert.equal(out.ok, true);
  assert.equal(out.records.length, 2);
  assert.deepEqual(out.records[0].breached_after, [CAB]); // AB=6 > 5
  assert.deepEqual(out.records[1].breached_before, [CAB]);
  assert.deepEqual(out.records[1].breached_after, [CABC]); // ABC=9 > 5
  assert.equal(out.records[1].monotonicity_ok, true); // image(CAB)=CABC survives
  assert.deepEqual(out.records[1].newly_revealed, []); // the breach was already carried, not new
});
