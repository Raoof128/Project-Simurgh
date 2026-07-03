// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  validateMergeChain,
  validateWindowCommitment,
} from "../../../../tools/simurgh-attestation/stage4m/core/mergeLatticeCore.mjs";

const D = (n) => `sha256:${String(n).repeat(64)}`;
const CA = D("a"),
  CB = D("b"),
  CC = D("c"),
  CNEW = D("d");
const GENESIS = {
  graphVersionDigest: D("e"),
  clusters: [CA, CB, CC],
  budgets: { [CA]: 5, [CB]: 5, [CC]: 5 },
};

const eventBase = () => ({
  schema: "simurgh.ccb.cluster_merge_event.v1",
  sequence: 1,
  parent_event_digest: null,
  old_graph_version_digest: D("e"),
  new_graph_version_digest: D("f"),
  merges: [
    {
      new_cluster_commitment: CNEW,
      new_budget: 5,
      merged_cluster_commitments: [CA, CB],
      merge_basis: ["payment_graph"],
    },
  ],
  carried_cluster_commitments: [CC],
  raw_identity_exported: false,
});

test("valid single-event chain: image map + new cluster set", () => {
  const r = validateMergeChain([eventBase()], GENESIS);
  assert.equal(r.ok, true);
  assert.equal(r.epochs.length, 1);
  const e = r.epochs[0];
  assert.equal(e.imageMap.get(CA), CNEW);
  assert.equal(e.imageMap.get(CB), CNEW);
  assert.equal(e.imageMap.get(CC), CC);
  assert.deepEqual([...e.clusters].sort(), [CNEW, CC].sort());
  assert.equal(e.mergedBudgets.get(CNEW), 5);
  assert.equal(e.eventDigest, recordDigest(eventBase()));
});

test("two-event chain binds parent digest and graph versions", () => {
  const e1 = eventBase();
  const e2 = {
    ...eventBase(),
    sequence: 2,
    parent_event_digest: recordDigest(e1),
    old_graph_version_digest: D("f"),
    new_graph_version_digest: D("1"),
    merges: [
      {
        new_cluster_commitment: D("2"),
        new_budget: 4,
        merged_cluster_commitments: [CNEW, CC],
        merge_basis: ["payment_graph"],
      },
    ],
    carried_cluster_commitments: [],
  };
  const r = validateMergeChain([e1, e2], GENESIS);
  assert.equal(r.ok, true);
  assert.equal(r.epochs[1].imageMap.get(CNEW), D("2"));
});

test("V3: budget inflation is a raw-43 INVALID EVENT (caught here, not at re-score)", () => {
  const inflated = eventBase();
  inflated.merges[0].new_budget = 6; // constituents CA,CB each budget 5 -> min 5
  const r = validateMergeChain([inflated], GENESIS);
  assert.equal(r.ok, false);
  assert.equal(r.rawCode, 43);
  assert.equal(r.reason, "budget_inflation");
  // and a merge exactly at the min budget is fine
  const atMin = eventBase();
  atMin.merges[0].new_budget = 5;
  assert.equal(validateMergeChain([atMin], GENESIS).ok, true);
});

const failCase = (mutate, reason) => {
  const e = eventBase();
  mutate(e);
  const r = validateMergeChain([e], GENESIS);
  assert.equal(r.ok, false);
  assert.equal(r.rawCode, 43);
  assert.equal(r.reason, reason);
};

test("split / duplicate / omitted / unknown old clusters -> 43 with exact reasons", () => {
  failCase((e) => {
    e.merges[0].merged_cluster_commitments = [CA, CB]; // keep >=2 constituents
    e.carried_cluster_commitments = [CA, CC]; // CA appears in merges AND carried -> duplicate
  }, "duplicate_old_cluster");
  failCase((e) => {
    e.carried_cluster_commitments = []; // CC vanishes
  }, "omitted_old_cluster");
  failCase((e) => {
    e.merges[0].merged_cluster_commitments = [CA, CB, D("9")];
  }, "unknown_old_cluster");
  // a "split" presents as the same commitment (CA) claimed by two new buckets
  failCase((e) => {
    e.merges[0].merged_cluster_commitments = [CA, CB];
    e.merges.push({
      new_cluster_commitment: D("3"),
      new_budget: 5,
      merged_cluster_commitments: [CA, CC],
      merge_basis: ["payment_graph"],
    });
    e.carried_cluster_commitments = [];
  }, "non_coarsening_split");
});

test("chain integrity -> 43: parent digest, sequence, graph version", () => {
  failCase((e) => (e.parent_event_digest = D("9")), "parent_digest_mismatch");
  failCase((e) => (e.sequence = 2), "sequence_gap");
  failCase((e) => (e.old_graph_version_digest = D("9")), "graph_version_mismatch");
});

test("schema police -> 43: unknown field, bad basis, raw identity", () => {
  failCase((e) => (e.extra_field = 1), "schema_invalid");
  failCase((e) => (e.merges[0].merge_basis = ["vibes"]), "invalid_merge_basis");
  failCase((e) => (e.raw_identity_exported = true), "raw_identity_exported");
  failCase((e) => (e.merges[0].email = "x"), "raw_identity_exported");
});

test("single-constituent merge is schema-invalid (>=2 required)", () => {
  const bad = {
    ...eventBase(),
    merges: [{ ...eventBase().merges[0], merged_cluster_commitments: [CA] }],
    carried_cluster_commitments: [CB, CC],
  };
  const r = validateMergeChain([bad], GENESIS);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "schema_invalid");
});

test("window commitments: cluster-level only, no consumer identifiers ever", () => {
  const w = {
    schema: "simurgh.vxd.window_commitment.v1",
    window: "2026-05",
    source_attestation_digest: D("a"),
    graph_version_digest: D("e"),
    clusters: [{ cluster_commitment: CA, cluster_weighted_total: 3, budget: 5, cluster_size: 1 }],
  };
  assert.equal(validateWindowCommitment(w).ok, true);
  assert.equal(
    validateWindowCommitment({
      ...w,
      clusters: [{ ...w.clusters[0], consumer_id_digest: D("b") }],
    }).reason,
    "schema_invalid"
  );
  assert.equal(validateWindowCommitment({ ...w, email: "x" }).reason, "raw_identity_exported");
  assert.equal(
    validateWindowCommitment({ ...w, clusters: [...w.clusters, w.clusters[0]] }).reason,
    "schema_invalid"
  );
});
