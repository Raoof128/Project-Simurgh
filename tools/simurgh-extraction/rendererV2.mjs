// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 renderer: exposes the strong/contextual distinction and the decision reason. Never
// accuses, attributes, or names a lab. Appends the sacred non-claim; throws on forbidden words.

export const SACRED_NON_CLAIM =
  "A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review.";

export const FORBIDDEN_WORDING = Object.freeze([
  "distillation attack confirmed",
  "abusive actor",
  "stolen",
  "fraudulent",
  "malicious campaign",
  "attacker",
  "deepseek",
  "moonshot",
  "minimax",
]);

function reason(result) {
  if (result.decision === "extraction_pattern_observed")
    return "extraction_pattern_observed because at least two strong families matched";
  if (result.decision === "single_signal_observed")
    return result.matched_contextual_families.length > 0 && result.strong_family_count < 2
      ? "single_signal_observed because volume is contextual and cannot independently corroborate"
      : "single_signal_observed because fewer than two strong families matched";
  return "no_pattern_observed because no signal families matched";
}

export function renderAttestationProseV2(result) {
  const strong = result.matched_strong_families.join(", ") || "none";
  const contextual = result.matched_contextual_families.join(", ") || "none";
  const summary =
    `Matched strong families: ${strong}. Matched contextual families: ${contextual}. ` +
    `Decision: ${reason(result)}. ${SACRED_NON_CLAIM}`;
  const lower = summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) {
    if (lower.includes(w)) throw new Error("intent_language_rejected");
  }
  return { rendered_summary: summary, intent_claim_made: false };
}
