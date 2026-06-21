// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  entryDigest,
  buildRegistryFromManifest,
  verifyRegistryHashChain,
  verifyAppendContinuity,
} from "../../../../tools/simurgh-temporal/registryChain.mjs";

function manifest(n) {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "stage-3q-containment-registry",
    snapshots: Array.from({ length: n }, (_, i) => ({
      entry_index: i,
      snapshot_id: `s${i}`,
      snapshot_label: `v${i}`,
      created_at_utc: "2026-06-21T00:00:00Z",
      catalogue_digest: `sha256:cat${i}`,
      catalogue_path: `p${i}`,
      corpus_digest: "sha256:corpus",
      target_attestations: [],
    })),
  };
}

test("buildRegistryFromManifest is deterministic and well-chained", () => {
  const r1 = buildRegistryFromManifest(manifest(2), "sha256:M");
  const r2 = buildRegistryFromManifest(manifest(2), "sha256:M");
  assert.deepEqual(r1, r2);
  assert.equal(r1.type, "simurgh.temporal.registry.v1");
  assert.equal(r1.source.timeline_manifest_digest, "sha256:M");
  assert.equal(r1.entries[0].entry_body.previous_entry_digest, "GENESIS");
  assert.equal(r1.entries[1].entry_body.previous_entry_digest, r1.entries[0].entry_digest);
  assert.equal(r1.head.head_entry_digest, r1.entries[1].entry_digest);
  assert.equal(r1.head.entry_count, 2);
  assert.equal(r1.entries[0].entry_digest, entryDigest(r1.entries[0].entry_body));
});

test("verifyRegistryHashChain passes clean and fails on a tampered body", () => {
  const reg = buildRegistryFromManifest(manifest(3), "sha256:M");
  assert.equal(verifyRegistryHashChain(reg).ok, true);
  const tampered = JSON.parse(JSON.stringify(reg));
  tampered.entries[1].entry_body.snapshot.snapshot_label = "evil";
  assert.equal(verifyRegistryHashChain(tampered).ok, false); // digest no longer matches body
});

test("verifyRegistryHashChain rejects a broken chain link", () => {
  const reg = buildRegistryFromManifest(manifest(2), "sha256:M");
  const broken = JSON.parse(JSON.stringify(reg));
  broken.entries[1].entry_body.previous_entry_digest = "sha256:wrong";
  broken.entries[1].entry_digest = entryDigest(broken.entries[1].entry_body); // re-digest body
  assert.equal(verifyRegistryHashChain(broken).ok, false); // link != prior entry_digest
});

test("verifyAppendContinuity accepts a true append and rejects removal/reorder", () => {
  const oldReg = buildRegistryFromManifest(manifest(1), "sha256:M1");
  const newReg = buildRegistryFromManifest(manifest(2), "sha256:M2");
  const previousHead = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_head_entry_index: 0,
    previous_head_entry_digest: oldReg.head.head_entry_digest,
    previous_entry_count: 1,
  };
  assert.equal(verifyAppendContinuity(previousHead, newReg).ok, true);
  // mutated preserved prefix: new registry whose entry[0] differs from the old head
  const unrelated = buildRegistryFromManifest(manifest(2), "sha256:Mx");
  unrelated.entries[0].entry_body.snapshot.snapshot_id = "different";
  unrelated.entries[0].entry_digest = entryDigest(unrelated.entries[0].entry_body);
  assert.equal(verifyAppendContinuity(previousHead, unrelated).ok, false);
});

test("verifyAppendContinuity accepts genesis previous head", () => {
  const newReg = buildRegistryFromManifest(manifest(1), "sha256:M");
  const genesis = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_head_entry_digest: "GENESIS",
    previous_entry_count: 0,
  };
  assert.equal(verifyAppendContinuity(genesis, newReg).ok, true);
});

test("verifyAppendContinuity rejects an entry removed vs previous head", () => {
  const oldReg = buildRegistryFromManifest(manifest(2), "sha256:M1");
  const shorter = buildRegistryFromManifest(manifest(1), "sha256:M2");
  const previousHead = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_head_entry_digest: oldReg.head.head_entry_digest,
    previous_entry_count: 2,
  };
  assert.equal(verifyAppendContinuity(previousHead, shorter).ok, false);
});
