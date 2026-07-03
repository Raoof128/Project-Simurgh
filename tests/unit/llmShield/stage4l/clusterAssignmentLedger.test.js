// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { CCB_RAW_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { clusterCommitmentDigest } from "../../../../tools/simurgh-attestation/stage4l/clusterCommitment.mjs";
import {
  assignmentLedgerDigest,
  buildAssignmentLedger,
  cardinalityDigest,
  checkCompleteness,
  computeClusterCardinality,
} from "../../../../tools/simurgh-attestation/stage4l/clusterAssignmentLedger.mjs";

const D = (n) => `sha256:${n.repeat(64)}`;
const W = "2026-07";
const asg = (consumerDigest, basisSeed) => {
  const a = {
    schema: "simurgh.ccb.cluster_assignment.v1",
    window: W,
    consumer_id_digest: consumerDigest,
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
const exposure = (digests) => ({
  schema: "simurgh.eba.ledger.v1",
  entries: digests.map((cd) => ({ consumer_id_digest: cd, window: W, weighted_total: 1 })),
});

test("ledger sorts deterministically and digests are stable", () => {
  const l1 = buildAssignmentLedger([asg(D("b"), "1"), asg(D("a"), "1")]);
  const l2 = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1")]);
  assert.deepEqual(l1, l2);
  assert.equal(assignmentLedgerDigest(l1), assignmentLedgerDigest(l2));
  assert.equal(l1.entries[0].consumer_id_digest, D("a"));
});

test("duplicate (consumer, window) throws duplicate_assignment", () => {
  assert.throws(
    () => buildAssignmentLedger([asg(D("a"), "1"), asg(D("a"), "2")]),
    (e) => e.reason === "duplicate_assignment"
  );
});

test("completeness: exact bijection passes", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1")]);
  const r = checkCompleteness(exposure([D("a"), D("b")]), ledger);
  assert.deepEqual(r, { ok: true, rawCode: 0, reason: null, offending: [] });
});

test("missing assignment -> raw 40", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1")]);
  const r = checkCompleteness(exposure([D("a"), D("b")]), ledger);
  assert.equal(r.rawCode, CCB_RAW_CODES.CLUSTER_COMMITMENT_MISSING);
  assert.deepEqual(r.offending, [D("b")]);
});

test("dangling assignment (no exposure subject) -> raw 42", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1")]);
  const r = checkCompleteness(exposure([D("a")]), ledger);
  assert.equal(r.rawCode, CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH);
  assert.deepEqual(r.offending, [D("b")]);
});

test("cardinality histogram: singleton slot always present, counts recompute", () => {
  // two members share basis seed "1" (one cluster of 2), one member alone on "2"
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1"), asg(D("c"), "2")]);
  const card = computeClusterCardinality(ledger);
  assert.equal(card.schema, "simurgh.ccb.cluster_cardinality.v1");
  assert.equal(card.window, W);
  assert.equal(card.assignment_ledger_digest, assignmentLedgerDigest(ledger));
  assert.deepEqual(card.histogram, { 1: 1, 2: 1 });
  assert.equal(card.cluster_count, 2);
  assert.equal(card.consumer_count, 3);
  assert.equal(typeof cardinalityDigest(card), "string");
});

test("cardinality of all-singletons records the evasion shape", () => {
  const ledger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "2"), asg(D("c"), "3")]);
  assert.deepEqual(computeClusterCardinality(ledger).histogram, { 1: 3 });
});
