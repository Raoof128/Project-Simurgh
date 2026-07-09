// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — Evasion–Threshold Curve + FP curve (plan Task 6). Explicit numerator/denominator
// counts over the committed score table; the reader sees exactly what lowering θ would cost. Results
// are conditional on the committed corpus (curve_scope non-claim in the bundle).
import { isFixedWidthDec, decLt } from "./detector.mjs";

const flagged = (score, theta) => !decLt(score, theta); // score ≥ θ

// Recompute one curve point: how many baseline (raw) bases and how many evasion variants flag at θ.
export function curveAt(bundle, theta) {
  const entries = bundle.score_table?.entries ?? [];
  const bases = new Set(entries.map((e) => e.base_id));
  let basesFlagged = 0;
  let variantsFlagged = 0;
  for (const e of entries) {
    if (e.variant === "raw" && flagged(e.score, theta)) basesFlagged += 1;
    if (e.variant === "evasion" && flagged(e.score, theta)) variantsFlagged += 1;
  }
  return {
    theta,
    bases_attempted: bases.size,
    bases_baseline_flagged: basesFlagged,
    variants_flagged: variantsFlagged,
  };
}

export function benignFpAt(bundle, theta) {
  const probes = bundle.benign_probe ?? [];
  return probes.filter((p) => flagged(p.score, theta)).length;
}

// 262 — every committed curve point matches recompute; θ grid is fixed-width and the flagged counts
// are non-increasing as θ increases (curveMonotoneInTheta).
export function checkCurve(bundle) {
  const pts = bundle.evasion_threshold_curve ?? [];
  for (const p of pts) {
    if (!isFixedWidthDec(p.theta)) return 262;
    const r = curveAt(bundle, p.theta);
    if (
      p.bases_baseline_flagged !== r.bases_baseline_flagged ||
      p.variants_flagged !== r.variants_flagged ||
      p.bases_attempted !== r.bases_attempted
    )
      return 262;
  }
  const sorted = [...pts].sort((a, b) => (a.theta < b.theta ? -1 : a.theta > b.theta ? 1 : 0));
  for (let i = 1; i < sorted.length; i++) {
    if (
      sorted[i].bases_baseline_flagged > sorted[i - 1].bases_baseline_flagged ||
      sorted[i].variants_flagged > sorted[i - 1].variants_flagged
    )
      return 262; // non-monotone in θ
  }
  return null;
}

// 263 — every committed FP-curve point matches recompute over the benign corpus.
export function checkFp(bundle) {
  for (const p of bundle.benign_fp_curve ?? []) {
    if (!isFixedWidthDec(p.theta)) return 263;
    if (p.false_positives !== benignFpAt(bundle, p.theta)) return 263;
  }
  return null;
}
