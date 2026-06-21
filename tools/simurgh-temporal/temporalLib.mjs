// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure temporal logic for Stage 3Q. No I/O, no clocks, no secrets. The transition
// lattice is anti-laundering: only contained->allowed is a regression; only
// allowed->contained is an improvement; invalid evidence -> integrity_failure.

export const TIMELINE_MANIFEST_SCHEMA = "simurgh.temporal.timeline_manifest.v1";
export const DIFF_MANIFEST_SCHEMA = "simurgh.temporal.diff_manifest.v1";
export const REGISTRY_SCHEMA = "simurgh.temporal.registry.v1";
export const REGRESSION_DIFF_SCHEMA = "simurgh.temporal.regression_diff.v1";
export const SELF_PROOF_SCHEMA = "simurgh.temporal.self_proof_results.v1";

export const TRANSITIONS = Object.freeze([
  "improved",
  "unchanged",
  "regressed",
  "non_comparable",
  "integrity_failure",
]);

// Mirrors the Stage 3P cell-result enum.
export const CELL_RESULTS = Object.freeze([
  "contained",
  "allowed",
  "rejected_invalid_target",
  "not_applicable",
  "verification_failed",
]);

export const RANKING_FIELD_NAMES = Object.freeze([
  "rank",
  "ranking",
  "ranking_position",
  "winner",
  "best_target",
  "leaderboard_rank",
  "aggregate_score",
  "score",
]);

// A result that means "the evidence itself is unusable" — never a containment claim.
const INTEGRITY_RESULTS = Object.freeze(["verification_failed", "rejected_invalid_target"]);
// A result that is structurally non-comparable across snapshots.
const NONCOMPARABLE_RESULTS = Object.freeze(["not_applicable"]);

export function validateUtcTimestamp(s) {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(s);
  if (!m) return false;
  const [, y, mo, d, h, mi, se] = m.map(Number);
  if (mo < 1 || mo > 12) return false;
  if (h > 23 || mi > 59 || se > 59) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > days[mo - 1]) return false;
  return true;
}

export function classifyCellTransition(before, after) {
  if (INTEGRITY_RESULTS.includes(before) || INTEGRITY_RESULTS.includes(after))
    return "integrity_failure";
  if (NONCOMPARABLE_RESULTS.includes(before) || NONCOMPARABLE_RESULTS.includes(after))
    return "non_comparable";
  if (before === "contained" && after === "allowed") return "regressed";
  if (before === "allowed" && after === "contained") return "improved";
  if (before === after) return "unchanged";
  return "non_comparable";
}

export function compareCoverageProfiles(beforeCells, afterCells) {
  const keys = new Set([...Object.keys(beforeCells ?? {}), ...Object.keys(afterCells ?? {})]);
  const cell_transitions = {};
  const summary = {
    regressed_cells: 0,
    improved_cells: 0,
    unchanged_cells: 0,
    non_comparable_cells: 0,
    integrity_failure_cells: 0,
    cross_target_rank_exported: false,
  };
  for (const key of [...keys].sort()) {
    const b = beforeCells?.[key]?.result ?? "not_applicable";
    const a = afterCells?.[key]?.result ?? "not_applicable";
    const transition = classifyCellTransition(b, a);
    cell_transitions[key] = { before: b, after: a, transition };
    if (transition === "regressed") summary.regressed_cells += 1;
    else if (transition === "improved") summary.improved_cells += 1;
    else if (transition === "unchanged") summary.unchanged_cells += 1;
    else if (transition === "non_comparable") summary.non_comparable_cells += 1;
    else if (transition === "integrity_failure") summary.integrity_failure_cells += 1;
  }
  return { cell_transitions, summary };
}

export function enforceSameTargetLineage(before, after) {
  return before?.target_lineage_id === after?.target_lineage_id
    ? null
    : "cross_target_diff_violation";
}

export function enforceSameCorpusDigest(before, after) {
  return before?.corpus_digest === after?.corpus_digest;
}

export function enforceLineageBinding(lineageId, attestation) {
  return attestation?.target?.target_id === lineageId ? null : "lineage_binding_violation";
}

function isSha256(v) {
  return typeof v === "string" && v.startsWith("sha256:");
}

export function validateTimelineManifest(m) {
  const errors = [];
  if (!m || m.type !== TIMELINE_MANIFEST_SCHEMA) errors.push("bad type");
  if (m?.stage !== "3Q") errors.push("bad stage");
  if (typeof m?.registry_id !== "string") errors.push("bad registry_id");
  const snaps = Array.isArray(m?.snapshots) ? m.snapshots : null;
  if (!snaps) errors.push("snapshots not an array");
  else
    snaps.forEach((s, i) => {
      if (s.entry_index !== i) errors.push(`snapshot ${i} entry_index not contiguous`);
      if (!validateUtcTimestamp(s.created_at_utc)) errors.push(`snapshot ${i} bad created_at_utc`);
      if (typeof s.snapshot_id !== "string") errors.push(`snapshot ${i} bad snapshot_id`);
      if (typeof s.snapshot_label !== "string") errors.push(`snapshot ${i} bad snapshot_label`);
      if (!isSha256(s.catalogue_digest)) errors.push(`snapshot ${i} bad catalogue_digest`);
      if (typeof s.catalogue_path !== "string") errors.push(`snapshot ${i} bad catalogue_path`);
      if (!isSha256(s.corpus_digest)) errors.push(`snapshot ${i} bad corpus_digest`);
      if (!Array.isArray(s.target_attestations)) errors.push(`snapshot ${i} bad target_attestations`);
      else
        s.target_attestations.forEach((t, j) => {
          if (typeof t.target_lineage_id !== "string") errors.push(`snapshot ${i} target ${j} bad lineage`);
          if (!isSha256(t.target_attestation_digest)) errors.push(`snapshot ${i} target ${j} bad digest`);
          if (typeof t.target_attestation_path !== "string") errors.push(`snapshot ${i} target ${j} bad path`);
        });
    });
  return { ok: errors.length === 0, errors };
}

export function validateDiffManifest(m) {
  const errors = [];
  if (!m || m.type !== DIFF_MANIFEST_SCHEMA) errors.push("bad type");
  if (m?.stage !== "3Q") errors.push("bad stage");
  const diffs = Array.isArray(m?.diffs) ? m.diffs : null;
  if (!diffs) errors.push("diffs not an array");
  else
    diffs.forEach((d, i) => {
      if (typeof d.diff_id !== "string") errors.push(`diff ${i} bad diff_id`);
      if (typeof d.target_lineage_id !== "string") errors.push(`diff ${i} bad target_lineage_id`);
      if (typeof d.before_target_snapshot_id !== "string") errors.push(`diff ${i} bad before_target_snapshot_id`);
      if (typeof d.after_target_snapshot_id !== "string") errors.push(`diff ${i} bad after_target_snapshot_id`);
      if (!isSha256(d.before_attestation_digest)) errors.push(`diff ${i} bad before_attestation_digest`);
      if (!isSha256(d.after_attestation_digest)) errors.push(`diff ${i} bad after_attestation_digest`);
      if (typeof d.before_attestation_path !== "string") errors.push(`diff ${i} bad before_attestation_path`);
      if (typeof d.after_attestation_path !== "string") errors.push(`diff ${i} bad after_attestation_path`);
      if (!isSha256(d.corpus_digest)) errors.push(`diff ${i} bad corpus_digest`);
      if (!validateUtcTimestamp(d.created_at_utc)) errors.push(`diff ${i} bad created_at_utc`);
    });
  return { ok: errors.length === 0, errors };
}

export function detectCrossTargetRankingExport(value) {
  let hit = null;
  const visit = (v) => {
    if (hit) return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (RANKING_FIELD_NAMES.includes(k)) {
          hit = "cross_target_rank_violation";
          return;
        }
        visit(val);
      }
    }
  };
  visit(value);
  return hit;
}

export function buildRegressionDiff({ diffRow, beforeAttestation, afterAttestation, diffManifestDigest }) {
  // 1. cross-target FIRST: comparing two different real targets is the leaderboard sin.
  const beforeMeta = {
    target_lineage_id: beforeAttestation.target.target_id,
    corpus_digest: beforeAttestation.corpus.corpus_digest,
  };
  const afterMeta = {
    target_lineage_id: afterAttestation.target.target_id,
    corpus_digest: afterAttestation.corpus.corpus_digest,
  };
  const lineage = enforceSameTargetLineage(beforeMeta, afterMeta);
  if (lineage) return { ok: false, violation: lineage };
  // 2. lineage binding: the manifest may not relabel the (agreeing) target id.
  const bb = enforceLineageBinding(diffRow.target_lineage_id, beforeAttestation);
  if (bb) return { ok: false, violation: bb };
  const ab = enforceLineageBinding(diffRow.target_lineage_id, afterAttestation);
  if (ab) return { ok: false, violation: ab };
  // 3. same corpus.
  if (!enforceSameCorpusDigest(beforeMeta, afterMeta)) return { ok: false, violation: "corpus_mismatch" };

  const { cell_transitions, summary } = compareCoverageProfiles(
    beforeAttestation.coverage_profile?.cells ?? {},
    afterAttestation.coverage_profile?.cells ?? {}
  );
  const diff = {
    type: REGRESSION_DIFF_SCHEMA,
    stage: "3Q",
    diff_id: diffRow.diff_id,
    target_lineage_id: diffRow.target_lineage_id,
    source: {
      diff_manifest_digest: diffManifestDigest,
      diff_manifest_path: "docs/research/llm-shield/evidence/stage-3q/diffs/diff-manifest.json",
    },
    created_at_utc: diffRow.created_at_utc,
    before: {
      target_version: diffRow.before_target_snapshot_id,
      attestation_digest: diffRow.before_attestation_digest,
    },
    after: {
      target_version: diffRow.after_target_snapshot_id,
      attestation_digest: diffRow.after_attestation_digest,
    },
    comparison_scope: {
      same_target_lineage_only: true,
      cross_target_comparison: false,
      same_corpus_digest_required: true,
    },
    cell_transitions,
    summary,
  };
  return { ok: true, diff };
}
