// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTemporalSelfProofFixture } from "../../../../tools/simurgh-temporal/selfProof.mjs";
import { buildRegistryFromManifest } from "../../../../tools/simurgh-temporal/registryChain.mjs";

const corpus = "sha256:corpus";
function att(id, cells, c = corpus) {
  return {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: { target_id: id },
    corpus: { corpus_digest: c },
    coverage_profile: { cells },
  };
}
const cell = (r) => ({ "direct_input::plain_marker": { result: r } });
const ts = "2026-06-21T00:00:00Z";
function manifest(n) {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "sp",
    snapshots: Array.from({ length: n }, (_, i) => ({
      entry_index: i,
      snapshot_id: `s${i}`,
      snapshot_label: `v${i}`,
      created_at_utc: ts,
      catalogue_digest: `sha256:cat${i}`,
      catalogue_path: `p${i}`,
      corpus_digest: corpus,
      target_attestations: [],
    })),
  };
}

test("each self-proof fixture trips its detector", () => {
  const tamperedReg = buildRegistryFromManifest(manifest(2), "sha256:M");
  tamperedReg.entries[0].entry_body.snapshot.snapshot_label = "tampered"; // digest mismatch
  const oldReg = buildRegistryFromManifest(manifest(2), "sha256:M1");
  const shorter = buildRegistryFromManifest(manifest(1), "sha256:M2");

  const cases = [
    {
      fixture_id: "clean-baseline",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: null,
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", cell("contained")),
        after: att("a", cell("contained")),
      },
    },
    {
      fixture_id: "genuine-regression",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "regressed",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", cell("contained")),
        after: att("a", cell("allowed")),
      },
    },
    {
      fixture_id: "genuine-improvement",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "improved",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", cell("allowed")),
        after: att("a", cell("contained")),
      },
    },
    {
      fixture_id: "cross-lineage-diff",
      kind: "diff",
      expected_result: "rejected",
      expected_detector: "cross_target_diff_violation",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", {}),
        after: att("a", {}),
        force_after_lineage: "b",
      },
    },
    {
      fixture_id: "corpus-mismatch",
      kind: "diff",
      expected_result: "non_comparable",
      expected_detector: "corpus_mismatch",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", {}, "sha256:c1"),
        after: att("a", {}, "sha256:c2"),
      },
    },
    {
      fixture_id: "before-integrity-failure",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "integrity_failure",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", cell("verification_failed")),
        after: att("a", cell("allowed")),
      },
    },
    {
      fixture_id: "after-integrity-failure",
      kind: "diff",
      expected_result: "accepted",
      expected_detector: "integrity_failure",
      payload: {
        row: { target_lineage_id: "a", diff_id: "d", created_at_utc: ts },
        before: att("a", cell("contained")),
        after: att("a", cell("verification_failed")),
      },
    },
    {
      fixture_id: "tampered-past-entry",
      kind: "registry_chain",
      expected_result: "rejected",
      expected_detector: "registry_chain_violation",
      payload: { registry: tamperedReg },
    },
    {
      fixture_id: "removed-entry-append",
      kind: "append_continuity",
      expected_result: "rejected",
      expected_detector: "append_continuity_violation",
      payload: {
        previousHead: {
          type: "simurgh.temporal.previous_registry_head.v1",
          stage: "3Q",
          previous_head_entry_digest: oldReg.head.head_entry_digest,
          previous_entry_count: 2,
        },
        registry: shorter,
      },
    },
    {
      fixture_id: "missing-created-at",
      kind: "manifest",
      expected_result: "rejected",
      expected_detector: "manifest_timestamp_violation",
      payload: {
        manifest: (() => {
          const m = manifest(1);
          delete m.snapshots[0].created_at_utc;
          return m;
        })(),
      },
    },
    {
      fixture_id: "invalid-created-at",
      kind: "manifest",
      expected_result: "rejected",
      expected_detector: "manifest_timestamp_violation",
      payload: {
        manifest: (() => {
          const m = manifest(1);
          m.snapshots[0].created_at_utc = "2026-06-21 00:00:00";
          return m;
        })(),
      },
    },
  ];
  for (const c of cases) {
    const r = evaluateTemporalSelfProofFixture(c);
    assert.equal(r.passed, true, `${c.fixture_id} should pass`);
    assert.equal(r.observed_detector, c.expected_detector, `${c.fixture_id} detector`);
  }
});
