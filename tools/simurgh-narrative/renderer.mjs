// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic Stage 3S renderer. Prose comes ONLY from verified slots, mapped through a
// fixed vocabulary→sentence table, sorted by slot_id. Never an automatic finding.
import { FORBIDDEN_WORDING } from "./claimChecker.mjs";

export const WORDING_PROSE = Object.freeze({
  no_issue_observed: "No integrity signals were observed.",
  integrity_signal_present: "An integrity signal was present.",
  manual_review_recommended: "Manual review is recommended.",
  evidence_incomplete: "Some evidence was incomplete.",
  proof_missing: "A signed device proof was missing during the session.",
  proof_valid: "Signed device proofs validated.",
  proof_replayed: "A replayed device proof was detected and rejected.",
  chain_valid: "The audit chain verified end to end.",
  chain_invalid: "The audit chain failed verification.",
  fallback_observed: "A provider fallback event was observed and contained.",
  containment_boundary_triggered: "A containment boundary was triggered.",
  provider_refusal_observed: "A provider refusal was observed.",
});

const DISCLAIMER =
  "This is not an automatic misconduct finding; it describes integrity signals for manual review. " +
  "Raw pixels, typed/pasted content, audio, process names, and window titles were not captured.";

export function renderNarrative(verifiedSlots) {
  const sentences = [...verifiedSlots]
    .sort((a, b) => String(a.slot_id).localeCompare(String(b.slot_id)))
    .map((s) => WORDING_PROSE[s.wording])
    .filter(Boolean);
  const body = sentences.length > 0 ? sentences.join(" ") : "No integrity signals were observed.";
  const rendered_summary = `${body} ${DISCLAIMER}`;
  // Defensive: the renderer must never emit forbidden wording.
  const lower = rendered_summary.toLowerCase();
  for (const f of FORBIDDEN_WORDING)
    if (lower.includes(f)) throw new Error(`renderer_forbidden_wording: ${f}`);
  return { rendered_summary, automatic_finding_made: false };
}
