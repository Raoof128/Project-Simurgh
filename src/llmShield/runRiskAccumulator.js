// SPDX-License-Identifier: AGPL-3.0-or-later
// Per-run risk scoring for Stage 3D. Pure functions; the router holds the
// per-session monotonic total on the session record. Thresholds are LOCKED;
// point weights are tunable and finalized by the fixture runner (spec §9).
// `safe` is a classification result, not a permission.

export const RISK_THRESHOLDS = Object.freeze({ safeMax: 2, warningMax: 5 });

export function riskPointsFor({
  inputVerdict,
  contextVerdict,
  toolGateVerdict,
  outputFirewallVerdict,
  repeatedWarning,
} = {}) {
  let pts = 0;
  if (inputVerdict === "warning") pts += 2;
  if (contextVerdict === "demoted") pts += 1;
  if (contextVerdict === "rejected") pts += 4;
  if (toolGateVerdict === "blocked") pts += 5;
  else if (toolGateVerdict === "allowed") pts += 1;
  if (outputFirewallVerdict === "blocked") pts += 5;
  if (repeatedWarning) pts += 2;
  return pts;
}

export function riskVerdict(score) {
  if (score <= RISK_THRESHOLDS.safeMax) return "safe";
  if (score <= RISK_THRESHOLDS.warningMax) return "warning";
  return "blocked";
}
