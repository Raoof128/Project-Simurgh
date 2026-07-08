// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — manifestCore / RCP (206). Plan Task 7. Motto: AnthropicSafe First, then
// ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  manifestRoot,
  inclusionProof,
  verifyInclusion,
  checkManifest,
} from "../../../../tools/simurgh-attestation/stage5a/core/manifestCore.mjs";

const D = (n) => "sha256:" + String(n).repeat(64).slice(0, 64);
const examples = [
  { example_digest: D(1), principle_ids: ["p.safety"] },
  { example_digest: D(2), principle_ids: ["p.honesty", "p.safety"] },
  { example_digest: D(3), principle_ids: ["p.honesty"] },
];
const registry = { "p.safety": { source_digest: D(9) }, "p.honesty": { source_digest: D(8) } };
const manifest = () => ({
  content: {
    schema: "simurgh.vnc.reflection_manifest.v1",
    corpus_id: "claude-constitution",
    corpus_revision: "2026-01-22",
    examples,
    principle_registry: registry,
    merkle_root: manifestRoot(examples.map((e) => e.example_digest)),
  },
});

test("inclusion proof round-trips for every example (4O Merkle lineage)", () => {
  const leaves = examples.map((e) => e.example_digest);
  const root = manifestRoot(leaves);
  for (const leaf of leaves) {
    const path = inclusionProof(leaves, leaf);
    assert.ok(verifyInclusion(leaf, path, root), leaf);
  }
  // a non-member fails
  assert.equal(inclusionProof(leaves, D(7)), null);
});

test("checkManifest: clean → null", () => {
  assert.equal(checkManifest(manifest()), null);
});

test("206: an example with empty principle_ids (totality — the projection's one law)", () => {
  const m = manifest();
  m.content.examples = [{ example_digest: D(1), principle_ids: [] }];
  m.content.merkle_root = manifestRoot([D(1)]);
  assert.equal(checkManifest(m).reason, "example_missing_principle");
});

test("206: a principle id absent from the registry", () => {
  const m = manifest();
  m.content.examples = [{ example_digest: D(1), principle_ids: ["p.ghost"] }];
  m.content.merkle_root = manifestRoot([D(1)]);
  assert.equal(checkManifest(m).reason, "unknown_principle");
});

test("206: a registry entry with a bad source digest", () => {
  const m = manifest();
  m.content.principle_registry = {
    "p.safety": { source_digest: "not-a-digest" },
    "p.honesty": { source_digest: D(8) },
  };
  assert.equal(checkManifest(m).reason, "registry_digest_invalid");
});

test("206: merkle root ≠ recompute (an example digest swapped under the same root)", () => {
  const m = manifest();
  m.content.examples = [...examples];
  m.content.examples[0] = { example_digest: D(5), principle_ids: ["p.safety"] };
  assert.equal(checkManifest(m).reason, "merkle_root_mismatch");
});
