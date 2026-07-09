// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — slip predicates (plan Task 5). External-review correction: the mutually-exclusive
// slip_type collapsed (a reference slip evasion<θ≤raw already implies evasion<raw), so slips are
// described by TWO independent mechanical booleans, not a taxonomy.
import { decLt, resolveScore } from "./detector.mjs";

// threshold_crossing: evasion < θ ≤ raw. This IS the "θ lies in the detection-gap interval
// (evasion, raw]" predicate (Lean detectionGapInterval).
export const thresholdCrossing = (raw, evasion, theta) =>
  decLt(evasion, theta) && !decLt(raw, theta);

// score_inversion: obfuscation lowered the score (a threshold-free ranking defect).
export const scoreInversion = (raw, evasion) => decLt(evasion, raw);

// 260 (arithmetic) / 261 (inversion claimed without a real inversion), in first-failure order.
export function checkSlips(bundle, theta) {
  for (const e of bundle.evasions ?? []) {
    const raw = resolveScore(bundle, e.base_id, "raw");
    const ev = resolveScore(bundle, e.base_id, "evasion");
    if (raw == null || ev == null) return 259; // unresolved reference is a binding failure
    const tc = thresholdCrossing(raw, ev, theta);
    const si = scoreInversion(raw, ev);
    if (e.threshold_crossing !== tc) return 260;
    if (e.score_inversion === true && !si) return 261; // VDA_INVERSION_UNSOUND
    if (e.score_inversion !== si) return 260; // claimed-false-but-inverts (arithmetic mismatch)
  }
  return null;
}
