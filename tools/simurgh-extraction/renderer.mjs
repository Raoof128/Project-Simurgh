// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic decision→prose. Describes what matched; never accuses, attributes,
// or names a lab. Appends the sacred non-claim. Throws on any forbidden wording.

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

const DECISION_PROSE = {
  no_pattern_observed: "No capability-extraction pattern was observed in the bounded metadata set.",
  single_signal_observed:
    "A single signal family was observed in the bounded metadata set; manual review only.",
  extraction_pattern_observed:
    "An extraction-shaped pattern across multiple distinct signal families was observed in the bounded metadata set; manual review recommended.",
};

export function renderAttestationProse(result) {
  const head = DECISION_PROSE[result.decision] ?? "Decision not recognised.";
  const families = [...result.matched_families].join(", ");
  const summary =
    `${head} Distinct signal families: ${result.distinct_family_count}` +
    (families ? ` (${families}).` : ".") +
    ` ${SACRED_NON_CLAIM}`;
  const lower = summary.toLowerCase();
  for (const w of FORBIDDEN_WORDING) {
    if (lower.includes(w)) throw new Error("intent_language_rejected");
  }
  return { rendered_summary: summary, intent_claim_made: false };
}
