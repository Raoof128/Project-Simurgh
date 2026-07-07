// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC census (138/139/140/145). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildEvidenceManifest,
  verifyCensus,
} from "../../../../tools/simurgh-attestation/stage4t/core/censusCore.mjs";
import {
  recordDigest,
  merkleRootSorted,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

// Three inline artifacts; the manifest item.digest is the artifact's own recordDigest.
const artifacts = [
  { kind: "stage4s_chain_bundle", epoch: "ep1", payload: { a: 1 } },
  { kind: "kernel_decision_records", epoch: "ep1", payload: { b: 2 } },
  { kind: "stage4n_temporal_anchor", epoch: "ep1", payload: { c: 3 } },
];

function fresh() {
  const items = artifacts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: a.epoch }));
  const manifest = buildEvidenceManifest({ epoch: "ep1", items });
  const artifactsByDigest = Object.fromEntries(artifacts.map((a) => [recordDigest(a), a]));
  return { capsule: { epoch: "ep1", evidence_manifest: manifest }, artifactsByDigest, manifest };
}

test("green manifest verifies", () => {
  const { capsule, artifactsByDigest } = fresh();
  assert.equal(verifyCensus(capsule, artifactsByDigest), null);
});

test("138 when a listed artifact is missing", () => {
  const { capsule, artifactsByDigest, manifest } = fresh();
  delete artifactsByDigest[manifest.items[0].digest];
  assert.equal(verifyCensus(capsule, artifactsByDigest).raw, 138);
});

test("139 when an unlisted artifact is smuggled in", () => {
  const { capsule, artifactsByDigest } = fresh();
  const extra = { kind: "stage4o_consent_manifests", epoch: "ep1", payload: { x: 9 } };
  artifactsByDigest[recordDigest(extra)] = extra;
  assert.equal(verifyCensus(capsule, artifactsByDigest).raw, 139);
});

test("140 when the census root is tampered", () => {
  const { capsule, artifactsByDigest, manifest } = fresh();
  manifest.census_root = "sha256:" + "0".repeat(64);
  assert.equal(verifyCensus(capsule, artifactsByDigest).raw, 140);
});

test("145 when an item belongs to another epoch (must re-root, else 140 fires first)", () => {
  const { capsule, artifactsByDigest, manifest } = fresh();
  manifest.items[0].epoch = "other-epoch";
  manifest.census_root = merkleRootSorted(manifest.items.map(recordDigest)); // re-seal so 140 passes
  assert.equal(verifyCensus(capsule, artifactsByDigest).raw, 145);
});
