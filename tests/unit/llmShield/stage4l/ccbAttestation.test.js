// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { SIGNAL_CLASS_WEIGHTS } from "../../../../tools/simurgh-attestation/stage4k/constants.mjs";
import { clusterCommitmentDigest } from "../../../../tools/simurgh-attestation/stage4l/clusterCommitment.mjs";
import {
  buildAssignmentLedger,
  computeClusterCardinality,
} from "../../../../tools/simurgh-attestation/stage4l/clusterAssignmentLedger.mjs";
import {
  buildCcbAttestation,
  buildCcbManifest,
  ccbAttestationDigest,
  verifyCcbManifest,
} from "../../../../tools/simurgh-attestation/stage4l/build-stage4l-attestation.mjs";

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

function fixture(overBudget) {
  const exposureLedger = {
    schema: "simurgh.eba.ledger.v1",
    entries: [
      { consumer_id_digest: D("a"), window: W, weighted_total: overBudget ? 50 : 2 },
      { consumer_id_digest: D("b"), window: W, weighted_total: overBudget ? 51 : 2 },
    ],
  };
  const assignmentLedger = buildAssignmentLedger([asg(D("a"), "1"), asg(D("b"), "1")]);
  const cardinality = computeClusterCardinality(assignmentLedger);
  const commitment = assignmentLedger.entries[0].cluster_commitment;
  const policy = {
    schema: "simurgh.ccb.cluster_budget_policy.v1",
    window: W,
    class_weights: { ...SIGNAL_CLASS_WEIGHTS },
    budgets: { [commitment]: 80 },
    non_claims: ["not_sybil_closure"],
  };
  return { exposureLedger, assignmentLedger, cardinality, policy, ebaManifestDigest: D("9") };
}

test("clean attestation: q9 pass, non-claims + known limitations + reserved slot present", () => {
  const att = buildCcbAttestation(fixture(false));
  assert.equal(att.schema, "simurgh.ccb.cluster_budget_attestation.v1");
  assert.equal(att.q9_status, "pass");
  assert.deepEqual(att.corroborating_commitments, []);
  assert.ok(att.non_claims.includes("not_structuring_closure_without_provider_binding"));
  assert.ok(att.known_limitations.includes("singleton_cluster_evasion_not_detected_but_ledgered"));
  assert.equal(att.cluster_totals[0].under_budget, true);
  assert.equal(att.per_account.length, 2); // reviewer contrast table preserved
});

test("over-budget is faithfully recorded, not refused", () => {
  const att = buildCcbAttestation(fixture(true));
  assert.equal(att.q9_status, "over_budget");
  assert.equal(att.cluster_totals[0].under_budget, false);
  assert.equal(att.denied_over_cluster_budget.length, 1);
});

test("completeness failure is refused outright", () => {
  const f = fixture(false);
  f.exposureLedger.entries.push({ consumer_id_digest: D("c"), window: W, weighted_total: 1 });
  assert.throws(() => buildCcbAttestation(f), /attestation_refused: cluster_commitment_missing/);
});

test("manifest signs and verifies; every bound digest tamper fails", () => {
  const f = fixture(false);
  const attestation = buildCcbAttestation(f);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const manifest = buildCcbManifest({ ...f, attestation, privateKey, publicKeyPem });
  assert.equal(verifyCcbManifest({ ...f, manifest, attestation, publicKey }).ok, true);

  // F6-style: policy tamper after signing
  const badPolicy = { ...f, policy: { ...f.policy, budgets: { ...f.policy.budgets } } };
  badPolicy.policy.budgets[Object.keys(f.policy.budgets)[0]] = 1;
  assert.equal(verifyCcbManifest({ ...badPolicy, manifest, attestation, publicKey }).ok, false);

  // F10-style: cardinality tamper
  const badCard = { ...f, cardinality: { ...f.cardinality, cluster_count: 99 } };
  assert.equal(verifyCcbManifest({ ...badCard, manifest, attestation, publicKey }).ok, false);

  // attestation tamper
  const badAtt = { ...attestation, q9_status: "over_budget" };
  assert.equal(verifyCcbManifest({ ...f, manifest, attestation: badAtt, publicKey }).ok, false);
  assert.notEqual(ccbAttestationDigest(badAtt), ccbAttestationDigest(attestation));

  // eba binding tamper
  assert.equal(
    verifyCcbManifest({ ...f, ebaManifestDigest: D("8"), manifest, attestation, publicKey }).ok,
    false
  );

  // signature bit flip
  const badSig = { ...manifest, signature: manifest.signature.slice(0, -4) + "AAA=" };
  assert.equal(verifyCcbManifest({ ...f, manifest: badSig, attestation, publicKey }).ok, false);
});
