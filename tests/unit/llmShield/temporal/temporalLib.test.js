// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  TRANSITIONS,
  CELL_RESULTS,
  validateUtcTimestamp,
  classifyCellTransition,
  compareCoverageProfiles,
  enforceSameTargetLineage,
  enforceSameCorpusDigest,
  enforceLineageBinding,
  validateTimelineManifest,
  validateDiffManifest,
  detectCrossTargetRankingExport,
  buildRegressionDiff,
} from "../../../../tools/simurgh-temporal/temporalLib.mjs";

test("constants", () => {
  assert.deepEqual(TRANSITIONS, [
    "improved",
    "unchanged",
    "regressed",
    "non_comparable",
    "integrity_failure",
  ]);
  assert.ok(CELL_RESULTS.includes("contained"));
});

test("validateUtcTimestamp accepts strict UTC Z, rejects the rest", () => {
  assert.equal(validateUtcTimestamp("2026-06-21T00:00:00Z"), true);
  assert.equal(validateUtcTimestamp("2026-06-21T00:00:00+02:00"), false);
  assert.equal(validateUtcTimestamp("2026-06-21 00:00:00"), false);
  assert.equal(validateUtcTimestamp("not-a-date"), false);
  assert.equal(validateUtcTimestamp(null), false);
  // calendar-impossible values rejected (no clock gremlin)
  assert.equal(validateUtcTimestamp("2026-02-31T00:00:00Z"), false);
  assert.equal(validateUtcTimestamp("2026-13-01T00:00:00Z"), false);
  assert.equal(validateUtcTimestamp("2026-06-21T24:00:00Z"), false);
  // leap-year correctness
  assert.equal(validateUtcTimestamp("2024-02-29T00:00:00Z"), true);
  assert.equal(validateUtcTimestamp("2026-02-29T00:00:00Z"), false);
});

test("classifyCellTransition implements the anti-laundering lattice", () => {
  assert.equal(classifyCellTransition("contained", "allowed"), "regressed");
  assert.equal(classifyCellTransition("allowed", "contained"), "improved");
  assert.equal(classifyCellTransition("contained", "contained"), "unchanged");
  assert.equal(classifyCellTransition("allowed", "allowed"), "unchanged");
  assert.equal(classifyCellTransition("contained", "not_applicable"), "non_comparable");
  assert.equal(classifyCellTransition("not_applicable", "allowed"), "non_comparable");
  // integrity failures can never be regressed/improved (both directions)
  assert.equal(classifyCellTransition("verification_failed", "allowed"), "integrity_failure");
  assert.equal(classifyCellTransition("contained", "verification_failed"), "integrity_failure");
  assert.equal(classifyCellTransition("rejected_invalid_target", "allowed"), "integrity_failure");
});

test("compareCoverageProfiles tallies transitions", () => {
  const before = {
    "direct_input::plain_marker": { result: "contained" },
    "tool_request::plain_marker": { result: "allowed" },
    "multi_turn::split_marker": { result: "contained" },
  };
  const after = {
    "direct_input::plain_marker": { result: "allowed" }, // regressed
    "tool_request::plain_marker": { result: "contained" }, // improved
    "multi_turn::split_marker": { result: "contained" }, // unchanged
  };
  const { cell_transitions, summary } = compareCoverageProfiles(before, after);
  assert.equal(cell_transitions["direct_input::plain_marker"].transition, "regressed");
  assert.equal(summary.regressed_cells, 1);
  assert.equal(summary.improved_cells, 1);
  assert.equal(summary.unchanged_cells, 1);
  assert.equal(summary.cross_target_rank_exported, false);
});

test("lineage + corpus gates", () => {
  assert.equal(
    enforceSameTargetLineage({ target_lineage_id: "a" }, { target_lineage_id: "a" }),
    null
  );
  assert.equal(
    enforceSameTargetLineage({ target_lineage_id: "a" }, { target_lineage_id: "b" }),
    "cross_target_diff_violation"
  );
  assert.equal(enforceSameCorpusDigest({ corpus_digest: "x" }, { corpus_digest: "x" }), true);
  assert.equal(enforceSameCorpusDigest({ corpus_digest: "x" }, { corpus_digest: "y" }), false);
});

test("enforceLineageBinding ties lineage to the 3P attestation target id", () => {
  const att = { target: { target_id: "keyword-filter-replica" } };
  assert.equal(enforceLineageBinding("keyword-filter-replica", att), null);
  assert.equal(enforceLineageBinding("tool-gate-replica", att), "lineage_binding_violation");
});

test("validateTimelineManifest requires schema + fixed UTC timestamps", () => {
  const good = {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "stage-3q-containment-registry",
    snapshots: [
      {
        entry_index: 0,
        snapshot_id: "s0",
        snapshot_label: "v1",
        created_at_utc: "2026-06-21T00:00:00Z",
        catalogue_digest: "sha256:a",
        catalogue_path: "p",
        corpus_digest: "sha256:c",
        target_attestations: [
          {
            target_lineage_id: "kf",
            target_attestation_digest: "sha256:t",
            target_attestation_path: "tp",
          },
        ],
      },
    ],
  };
  assert.equal(validateTimelineManifest(good).ok, true);
  const noTs = JSON.parse(JSON.stringify(good));
  delete noTs.snapshots[0].created_at_utc;
  assert.equal(validateTimelineManifest(noTs).ok, false);
  const badIdx = JSON.parse(JSON.stringify(good));
  badIdx.snapshots[0].entry_index = 5;
  assert.equal(validateTimelineManifest(badIdx).ok, false);
  const noCorpus = JSON.parse(JSON.stringify(good));
  delete noCorpus.snapshots[0].corpus_digest;
  assert.equal(validateTimelineManifest(noCorpus).ok, false);
});

test("validateDiffManifest accepts empty (genesis) and validates rows", () => {
  assert.equal(
    validateDiffManifest({ type: "simurgh.temporal.diff_manifest.v1", stage: "3Q", diffs: [] }).ok,
    true
  );
  const bad = {
    type: "simurgh.temporal.diff_manifest.v1",
    stage: "3Q",
    diffs: [{ diff_id: "d", target_lineage_id: "a", created_at_utc: "nope" }],
  };
  assert.equal(validateDiffManifest(bad).ok, false);
  const fullRow = {
    type: "simurgh.temporal.diff_manifest.v1",
    stage: "3Q",
    diffs: [
      {
        diff_id: "d",
        target_lineage_id: "a",
        before_target_snapshot_id: "a@v1",
        after_target_snapshot_id: "a@v2",
        before_attestation_digest: "sha256:b",
        after_attestation_digest: "sha256:a",
        before_attestation_path: "bp",
        after_attestation_path: "ap",
        corpus_digest: "sha256:c",
        created_at_utc: "2026-06-21T00:00:00Z",
      },
    ],
  };
  assert.equal(validateDiffManifest(fullRow).ok, true);
});

test("detectCrossTargetRankingExport flags forbidden field names", () => {
  assert.equal(detectCrossTargetRankingExport({ rank: 1 }), "cross_target_rank_violation");
  assert.equal(detectCrossTargetRankingExport({ best_target: "x" }), "cross_target_rank_violation");
  assert.equal(detectCrossTargetRankingExport({ summary: { regressed_cells: 2 } }), null);
});

function att(targetId, cells, corpus = "sha256:corpus") {
  return {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: { target_id: targetId },
    corpus: { corpus_digest: corpus },
    coverage_profile: { cells },
  };
}

test("buildRegressionDiff emits a same-target diff with source + timestamp", () => {
  const before = att("keyword-filter-replica", {
    "direct_input::plain_marker": { result: "contained" },
  });
  const after = att("keyword-filter-replica", {
    "direct_input::plain_marker": { result: "allowed" },
  });
  const row = {
    diff_id: "kf-v1-to-v2",
    target_lineage_id: "keyword-filter-replica",
    before_target_snapshot_id: "keyword-filter-replica@v1",
    after_target_snapshot_id: "keyword-filter-replica@v2",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, true);
  assert.equal(res.diff.type, "simurgh.temporal.regression_diff.v1");
  assert.equal(res.diff.source.diff_manifest_digest, "sha256:DM");
  assert.equal(res.diff.created_at_utc, "2026-06-21T00:00:00Z");
  assert.equal(res.diff.cell_transitions["direct_input::plain_marker"].transition, "regressed");
  assert.equal(res.diff.summary.regressed_cells, 1);
});

test("buildRegressionDiff trips cross_target_diff_violation when targets differ (before binding)", () => {
  const before = att("keyword-filter-replica", {});
  const after = att("tool-gate-replica", {});
  const row = {
    diff_id: "x",
    target_lineage_id: "keyword-filter-replica",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "cross_target_diff_violation");
});

test("buildRegressionDiff trips lineage_binding_violation when targets agree but manifest relabels", () => {
  const before = att("keyword-filter-replica", {});
  const after = att("keyword-filter-replica", {});
  const row = {
    diff_id: "x",
    target_lineage_id: "relabelled-lineage",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "lineage_binding_violation");
});

test("buildRegressionDiff rejects corpus mismatch", () => {
  const before = att("keyword-filter-replica", {}, "sha256:c1");
  const after = att("keyword-filter-replica", {}, "sha256:c2");
  const row = {
    diff_id: "x",
    target_lineage_id: "keyword-filter-replica",
    created_at_utc: "2026-06-21T00:00:00Z",
  };
  const res = buildRegressionDiff({
    diffRow: row,
    beforeAttestation: before,
    afterAttestation: after,
    diffManifestDigest: "sha256:DM",
  });
  assert.equal(res.ok, false);
  assert.equal(res.violation, "corpus_mismatch");
});
