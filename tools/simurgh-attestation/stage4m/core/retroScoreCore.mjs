// SPDX-License-Identifier: AGPL-3.0-or-later
// Retroactive re-scoring (spec §4.2). Pure arithmetic over committed cluster-level window
// totals; no re-measurement. Monotonicity is stated and checked through the merge image —
// old and new cluster commitments are DIFFERENT identifier spaces (spec §2).
import { recordDigest } from "./canonical.mjs";
import { VXD_RESCORE_SCHEMA } from "../constants.mjs";

export function breachedClusters(clusters) {
  return clusters
    .filter((c) => c.cluster_weighted_total > c.budget)
    .map((c) => c.cluster_commitment)
    .sort();
}

// Applies ONE epoch to ONE window commitment. Returns the re-score record plus the
// post-merge window state (so rescoreAll can fold epoch i+1 on top of epoch i).
export function rescoreWindow({ windowCommitment, epoch }) {
  const byCommitment = new Map(windowCommitment.clusters.map((c) => [c.cluster_commitment, c]));
  const before = breachedClusters(windowCommitment.clusters);
  const afterClusters = [];
  const findings = [];
  for (const m of epoch.event.merges) {
    const present = m.merged_cluster_commitments.filter((c) => byCommitment.has(c));
    if (present.length === 0) continue; // no exposure from this window flows into the bucket
    // Budget non-inflation was already enforced by validateMergeChain (Task 3, reviewer fix);
    // by the time we re-score, m.new_budget is guaranteed <= every constituent budget.
    const total = present.reduce((s, c) => s + byCommitment.get(c).cluster_weighted_total, 0);
    const size = present.reduce((s, c) => s + byCommitment.get(c).cluster_size, 0);
    afterClusters.push({
      cluster_commitment: m.new_cluster_commitment,
      cluster_weighted_total: total,
      budget: m.new_budget,
      cluster_size: size,
    });
    const singletons = present.filter((c) => byCommitment.get(c).cluster_size === 1);
    if (singletons.length >= 2) {
      findings.push(`singleton_merge_contradiction:${recordDigest(windowCommitment)}`);
    }
  }
  for (const c of epoch.event.carried_cluster_commitments) {
    if (byCommitment.has(c)) afterClusters.push({ ...byCommitment.get(c) });
  }
  const after = breachedClusters(afterClusters);
  const imageOfBefore = before.map((b) => epoch.imageMap.get(b)).filter(Boolean);
  const newlyRevealed = after.filter((a) => !imageOfBefore.includes(a)).sort();
  const monotonicityOk = imageOfBefore.every((i) => after.includes(i));
  const record = {
    schema: VXD_RESCORE_SCHEMA,
    window: windowCommitment.window,
    merge_event_digest: epoch.eventDigest,
    breached_before: before,
    breached_after: after,
    newly_revealed: newlyRevealed,
    monotonicity_ok: monotonicityOk,
    findings: [...findings].sort(),
  };
  return {
    ok: true,
    record,
    nextWindowState: {
      ...windowCommitment,
      graph_version_digest: epoch.event.new_graph_version_digest,
      clusters: afterClusters,
    },
  };
}

export function rescoreAll({ windows, epochs }) {
  const records = [];
  for (const w of windows) {
    let state = w;
    for (const epoch of epochs) {
      const r = rescoreWindow({ windowCommitment: state, epoch });
      if (!r.ok) return r;
      records.push(r.record);
      state = r.nextWindowState;
    }
  }
  return { ok: true, records };
}

// The V5 arm. ONLY the monotonicity predicate lives here: every committed breached_before
// member's image must appear in the RECOMPUTED breached_after. All other drift between the
// committed and recomputed records is a digest mismatch handled by the CLI (raw 22 lineage).
export function verifyRescoreRecord({ committed, recomputed, epoch }) {
  for (const b of committed.breached_before) {
    const image = epoch.imageMap.get(b) ?? b;
    if (!recomputed.breached_after.includes(image)) {
      return {
        ok: false,
        rawCode: 44,
        reason: "anti_monotonicity_violation",
        offending: { window: committed.window, old_cluster_commitment: b, image_commitment: image },
      };
    }
  }
  return { ok: true };
}
