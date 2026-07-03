// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import {
  canonicalJson,
  merkleRootSorted,
  recordDigest,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4m/core/disclosureCore.mjs";
import {
  buildVxdAttestation,
  buildVxdManifest,
  verifyVxdManifest,
} from "../../../../tools/simurgh-attestation/stage4m/node/build-stage4m-attestation.mjs";
import { buildArticle73Projection } from "../../../../tools/simurgh-attestation/stage4m/node/article73Projection.mjs";

const D = (n) => `sha256:${String(n).repeat(64)}`;
const CA = D("a"),
  CB = D("b"),
  CC = D("c"),
  CNEW = D("d");
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
const rescore = {
  schema: "simurgh.vxd.retro_rescore.v1",
  window: "2026-05",
  merge_event_digest: recordDigest(mergeEvent),
  breached_before: [],
  breached_after: [CNEW],
  newly_revealed: [CNEW],
  monotonicity_ok: true,
  findings: [`singleton_merge_contradiction:${recordDigest(windowCommitment)}`],
};
const disclosure = {
  schema: "simurgh.vxd.disclosure_claim.v1",
  chain_position: 3,
  claims: [
    {
      kind: "window_range",
      value: ["2026-05", "2026-05"],
      bound_commitments: [{ digest: recordDigest(windowCommitment), chain_position: 0 }],
    },
    {
      kind: "consumer_count",
      value: 3,
      bound_commitments: [{ digest: recordDigest(windowCommitment), chain_position: 0 }],
    },
  ],
  demand_side_evidence_digest: null,
  prose_history_digest: D("7"),
};
const chain = buildChain([
  { kind: "window_commitment", digest: recordDigest(windowCommitment) },
  { kind: "merge_event", digest: recordDigest(mergeEvent) },
  { kind: "rescore_record", digest: recordDigest(rescore) },
  { kind: "disclosure_claim", digest: recordDigest(disclosure) },
]);
const input = {
  windows: [windowCommitment],
  mergeEvents: [mergeEvent],
  rescoreRecords: [rescore],
  disclosure,
  contests: [],
  acks: [],
  chain,
  sourceCcbManifestDigest: D("2"),
  leanProofDigest: D("3"),
};

test("attestation: roots, aggregates, aggregate-only guard, reserved slots", () => {
  const a = buildVxdAttestation(input);
  assert.equal(a.schema, "simurgh.vxd.attestation.v1");
  assert.equal(a.windows_root, merkleRootSorted([recordDigest(windowCommitment)]));
  assert.equal(a.merge_chain_root, merkleRootSorted([recordDigest(mergeEvent)]));
  assert.equal(a.rescore_root, merkleRootSorted([recordDigest(rescore)]));
  assert.equal(a.disclosure_root, merkleRootSorted([recordDigest(disclosure)]));
  assert.equal(a.contest_root, merkleRootSorted([]));
  assert.deepEqual(a.aggregates, {
    window_count: 1,
    breach_count: 1,
    newly_revealed_count: 1,
    exposure_mass_total: 9,
    cluster_size_histogram: { 1: 3 },
  });
  for (const c of [CA, CB, CC]) assert.ok(!canonicalJson(a).includes(c), `leaked ${c}`);
  assert.equal(a.demand_side_evidence_digest, null);
  assert.deepEqual(a.corroborating_commitments, []);
  assert.ok(a.known_limitations.includes("no_merge_no_reveal"));
  assert.equal(a.lean_proof_digest, D("3"));
});

test("manifest signs, verifies, and fails closed on tamper", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const a = buildVxdAttestation(input);
  const m = buildVxdManifest({ attestation: a, privateKey, publicKeyPem });
  assert.equal(verifyVxdManifest({ manifest: m, attestation: a, publicKey }).ok, true);
  const tampered = { ...a, aggregates: { ...a.aggregates, breach_count: 0 } };
  assert.equal(
    verifyVxdManifest({ manifest: m, attestation: tampered, publicKey }).reason,
    "attestation_digest_mismatch"
  );
  const badSig = { ...m, signature: `ed25519:${Buffer.from("nope").toString("base64")}` };
  assert.equal(
    verifyVxdManifest({ manifest: badSig, attestation: a, publicKey }).reason,
    "signature_invalid"
  );
});

test("article-73 projection: recomputable slots only, not_projected defaults, byte-stable", () => {
  const a = buildVxdAttestation(input);
  const p1 = buildArticle73Projection({ attestation: a, disclosure });
  const p2 = buildArticle73Projection({ attestation: a, disclosure });
  assert.equal(recordDigest(p1), recordDigest(p2));
  assert.equal(p1.schema, "simurgh.vxd.article73_projection.v1");
  assert.equal(p1.incident_description, "not_projected");
  assert.equal(p1.corrective_context, "not_projected");
  assert.deepEqual(p1.temporal_scope, {
    value: ["2026-05", "2026-05"],
    source_digest: recordDigest(disclosure),
  });
  assert.deepEqual(p1.affected_counts, { value: 3, source_digest: recordDigest(disclosure) });
  assert.deepEqual(p1.non_claims, [
    "not_legal_compliance_certification",
    "projection_is_output_surface_not_filing",
  ]);
  // no synthesized free text: EVERY projected field is either the literal "not_projected" or a
  // { value, source_digest } object whose source_digest is a real bundle digest.
  const structural = new Set(["schema", "attestation_digest", "non_claims"]);
  for (const [k, v] of Object.entries(p1)) {
    if (structural.has(k)) continue;
    const ok =
      v === "not_projected" ||
      (v && typeof v === "object" && "value" in v && /^sha256:[a-f0-9]{64}$/.test(v.source_digest));
    assert.ok(ok, `projected field ${k} must be "not_projected" or { value, source_digest }`);
  }
});
