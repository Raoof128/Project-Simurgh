// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { CCB_RAW_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { SIGNAL_CLASS_WEIGHTS } from "../../../../tools/simurgh-attestation/stage4k/constants.mjs";
import { clusterCommitmentDigest } from "../../../../tools/simurgh-attestation/stage4l/clusterCommitment.mjs";
import { buildAssignmentLedger } from "../../../../tools/simurgh-attestation/stage4l/clusterAssignmentLedger.mjs";
import {
  aggregateClusterExposure,
  checkClusterBudgets,
} from "../../../../tools/simurgh-attestation/stage4l/clusterBudgetGate.mjs";

const D = (n) => `sha256:${n.repeat(64)}`;
const W = "2026-07";
const asg = (cd, basisSeed) => {
  const a = {
    schema: "simurgh.ccb.cluster_assignment.v1",
    window: W,
    consumer_id_digest: cd,
    cluster_commitment: "",
    binding_level: "cluster",
    cluster_basis: ["payment_graph"],
    basis_digests: { payment_graph: D(basisSeed) },
    binding_policy_digest: D("d"),
    graph_version_digest: D("e"),
    raw_identity_exported: false,
  };
  a.cluster_commitment = clusterCommitmentDigest(a);
  return a;
};
const exposure = (pairs) => ({
  schema: "simurgh.eba.ledger.v1",
  entries: pairs.map(([cd, weighted_total]) => ({
    consumer_id_digest: cd,
    window: W,
    weighted_total,
  })),
});
const policy = (budgets) => ({
  schema: "simurgh.ccb.cluster_budget_policy.v1",
  window: W,
  class_weights: { ...SIGNAL_CLASS_WEIGHTS },
  budgets,
  non_claims: ["not_sybil_closure"],
});

test("aggregation sums weighted totals per cluster commitment", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1"), asg(D("c"), "2")]);
  const totals = aggregateClusterExposure(
    exposure([
      [D("a"), 3],
      [D("b"), 4],
      [D("c"), 5],
    ]),
    ledger
  );
  assert.equal(totals.length, 2);
  const shared = totals.find((t) => t.consumer_count === 2);
  assert.equal(shared.cluster_weighted_total, 7);
});

test("F-STRUCTURE: 100 x 1 in one cluster exceeds B_cluster 80 -> raw 41", () => {
  // deterministic distinct digests (digits are valid hex chars):
  const cds = Array.from(
    { length: 100 },
    (_, i) => `sha256:${String(i).padStart(4, "0").repeat(16)}`
  );
  const ledger = buildAssignmentLedger(cds.map((cd) => asg(cd, "f")));
  const totals = aggregateClusterExposure(exposure(cds.map((cd) => [cd, 1])), ledger);
  assert.equal(totals.length, 1);
  assert.equal(totals[0].cluster_weighted_total, 100);
  const r = checkClusterBudgets(totals, policy({ [totals[0].cluster_commitment]: 80 }));
  assert.equal(r.rawCode, CCB_RAW_CODES.CLUSTER_BUDGET_EXCEEDED);
  assert.deepEqual(r.offending, [totals[0].cluster_commitment]);
});

test("boundary == B_cluster passes (Q8 semantics)", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1")]);
  const totals = aggregateClusterExposure(
    exposure([
      [D("a"), 4],
      [D("b"), 4],
    ]),
    ledger
  );
  const r = checkClusterBudgets(totals, policy({ [totals[0].cluster_commitment]: 8 }));
  assert.deepEqual(r, { ok: true, rawCode: 0, reason: null, offending: [] });
});

test("missing cluster budget fails closed to 29, never 41", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1")]);
  const totals = aggregateClusterExposure(exposure([[D("a"), 1]]), ledger);
  const r = checkClusterBudgets(totals, policy({}));
  assert.equal(r.rawCode, 29);
});

test("weight drift fails closed to 29", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1")]);
  const totals = aggregateClusterExposure(exposure([[D("a"), 1]]), ledger);
  const p = policy({ [totals[0].cluster_commitment]: 5 });
  p.class_weights = { ...p.class_weights, final_answer: 99 };
  assert.equal(checkClusterBudgets(totals, p).rawCode, 29);
});

test("policy schema mismatch fails closed to 29", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1")]);
  const totals = aggregateClusterExposure(exposure([[D("a"), 1]]), ledger);
  const p = { ...policy({ [totals[0].cluster_commitment]: 5 }), schema: "wrong.v1" };
  assert.equal(checkClusterBudgets(totals, p).rawCode, 29);
});
