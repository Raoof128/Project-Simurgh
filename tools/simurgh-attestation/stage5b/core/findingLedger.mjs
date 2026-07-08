// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — finding ledger / No Silent Bypass (spec §1 Law 1/4, §3; plan Task 6).
// A finding: { attack_id, target_raw, outcome ∈ VAR_OUTCOME_CLASSES, severity? }. The red-team
// cannot omit or launder its own successful attacks. A found bypass is CONTENT (disclosed +
// severity-signed), never a project failure ("A Bypass Is Not a Break").
// Motto: AnthropicSafe First, then ReviewerSafe.
import { VAR_OUTCOME_CLASSES } from "../constants.mjs";

const VALID_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);

// The truthful outcome implied by the target's actual code: GREEN (0) = the target let the
// attack through (bypass); any non-zero = the target caught it (survived).
export function outcomeForRaw(targetRaw) {
  return targetRaw === 0 ? "bypass" : "survived";
}

// 216 — every finding maps to exactly one known outcome class.
export function checkFindingClassification(finding) {
  if (!finding || !VAR_OUTCOME_CLASSES.includes(finding.outcome))
    return {
      raw: 216,
      reason: "var_finding_classification_invalid",
      detail: { outcome: finding?.outcome },
    };
  return { raw: 0, reason: "green" };
}

// 217 — No Silent Bypass (laundering): a GREEN target (target_raw 0) labelled `survived` hides a
// real bypass. Audit-tier teeth: recomputes nothing here, but the recorded pair is contradictory.
export function checkNoSilentBypass(finding) {
  if (finding.target_raw === 0 && finding.outcome === "survived")
    return { raw: 217, reason: "var_silent_bypass", detail: { laundered: finding.attack_id } };
  return { raw: 0, reason: "green" };
}

// 218 — the reverse mislabel: an outcome of `bypass` with a non-zero target_raw.
export function checkBypassLabelMismatch(finding) {
  if (finding.outcome === "bypass" && finding.target_raw !== 0)
    return {
      raw: 218,
      reason: "var_bypass_label_mismatch",
      detail: { attack_id: finding.attack_id },
    };
  return { raw: 0, reason: "green" };
}

// 220 — every `bypass` must carry a valid severity AND be disclosed (id + severity) in the signed
// known_limitations list. Survived findings need no severity.
export function checkSeverityLock(finding, knownLimitations) {
  if (finding.outcome !== "bypass") return { raw: 0, reason: "green" };
  const bad = (detail) => ({ raw: 220, reason: "var_severity_unsigned", detail });
  if (!VALID_SEVERITIES.includes(finding.severity)) return bad({ severity: finding.severity });
  const disclosed = (knownLimitations || []).some(
    (l) => typeof l === "string" && l.includes(finding.attack_id) && l.includes(finding.severity)
  );
  if (!disclosed) return bad({ not_in_known_limitations: finding.attack_id });
  return { raw: 0, reason: "green" };
}

// 217 (set-level) — No Silent Bypass by OMISSION: any driven attack whose target went GREEN
// (target_raw 0) must appear in the findings. Audit-tier check over the driven results.
export function detectOmittedBypasses(findings, drivenResults) {
  const recorded = new Set(findings.map((f) => f.attack_id));
  const omitted = drivenResults
    .filter((d) => d.target_raw === 0 && !recorded.has(d.attack_id))
    .map((d) => d.attack_id)
    .sort();
  if (omitted.length) return { raw: 217, reason: "var_silent_bypass", detail: { omitted } };
  return { raw: 0, reason: "green" };
}
