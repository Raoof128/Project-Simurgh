// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLUSTER_BASIS_ENUM,
  RAW_IDENTITY_DENYLIST,
} from "../../../../tools/simurgh-attestation/stage4l/constants.mjs";
import {
  CcbSchemaError,
  clusterCommitmentDigest,
  validateAssignment,
} from "../../../../tools/simurgh-attestation/stage4l/clusterCommitment.mjs";

const D = (n) => `sha256:${n.repeat(64)}`;
const clean = () => ({
  schema: "simurgh.ccb.cluster_assignment.v1",
  window: "2026-07",
  consumer_id_digest: D("a"),
  cluster_commitment: "", // filled below
  binding_level: "cluster",
  cluster_basis: ["payment_graph", "traffic_shape"],
  basis_digests: { payment_graph: D("b"), traffic_shape: D("c") },
  binding_policy_digest: D("d"),
  graph_version_digest: D("e"),
  raw_identity_exported: false,
});
const withCommitment = () => {
  const a = clean();
  a.cluster_commitment = clusterCommitmentDigest(a);
  return a;
};

test("clean assignment validates", () => {
  validateAssignment(withCommitment()); // must not throw
});

test("commitment is deterministic and shared across cluster members", () => {
  const a = withCommitment();
  const b = { ...withCommitment(), consumer_id_digest: D("f") };
  b.cluster_commitment = clusterCommitmentDigest(b);
  assert.equal(a.cluster_commitment, b.cluster_commitment); // same cluster fields
});

test("unknown top-level field fails closed", () => {
  const a = { ...withCommitment(), extra_field: "x" };
  assert.throws(
    () => validateAssignment(a),
    (e) => e instanceof CcbSchemaError && e.reason === "schema_unknown_field"
  );
});

test("every raw-identity key is rejected, top-level and nested", () => {
  for (const bad of RAW_IDENTITY_DENYLIST) {
    const top = { ...withCommitment(), [bad]: "x" };
    assert.throws(
      () => validateAssignment(top),
      (e) => ["schema_unknown_field", "raw_identity_key"].includes(e.reason),
      bad
    );
    const nested = withCommitment();
    nested.basis_digests = { ...nested.basis_digests, [bad]: D("9") };
    assert.throws(
      () => validateAssignment(nested),
      (e) => e.reason === "raw_identity_key" || e.reason === "basis_key_not_in_basis",
      bad
    );
  }
});

test("raw_identity_exported must be exactly false", () => {
  const a = { ...withCommitment(), raw_identity_exported: true };
  assert.throws(
    () => validateAssignment(a),
    (e) => e.reason === "raw_identity_exported_not_false"
  );
});

test("cluster_basis entries must come from the frozen enum", () => {
  const a = withCommitment();
  a.cluster_basis = ["payment_graph", "made_up_basis"];
  a.basis_digests = { payment_graph: D("b"), made_up_basis: D("c") };
  a.cluster_commitment = clusterCommitmentDigest(a);
  assert.throws(
    () => validateAssignment(a),
    (e) => e.reason === "unknown_cluster_basis"
  );
  assert.ok(CLUSTER_BASIS_ENUM.includes("payment_graph"));
});

test("basis_digests keys must be a subset of cluster_basis, values sha256", () => {
  const missing = withCommitment();
  missing.basis_digests = { payment_graph: D("b") }; // traffic_shape missing
  missing.cluster_commitment = clusterCommitmentDigest(missing);
  assert.throws(
    () => validateAssignment(missing),
    (e) => e.reason === "basis_digest_missing"
  );
  const badVal = withCommitment();
  badVal.basis_digests = { ...badVal.basis_digests, payment_graph: "not-a-digest" };
  badVal.cluster_commitment = clusterCommitmentDigest(badVal);
  assert.throws(
    () => validateAssignment(badVal),
    (e) => e.reason === "schema_invalid_digest"
  );
});

test("stale commitment (byte flip) is rejected", () => {
  const a = withCommitment();
  a.cluster_commitment = D("0");
  assert.throws(
    () => validateAssignment(a),
    (e) => e.reason === "commitment_recompute_mismatch"
  );
});

test("binding_level must be exactly 'cluster'", () => {
  const a = { ...withCommitment(), binding_level: "account" };
  assert.throws(
    () => validateAssignment(a),
    (e) => e.reason === "invalid_binding_level"
  );
});
