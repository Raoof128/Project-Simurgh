// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W contest adapter — pays narrative_claim_contest_deferred (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// NO CLONED COURT: the status table lives in 4V; this module only adapts addresses.
import { deriveSectionStatus } from "../../stage4v/core/conflictMap.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";

export const spanContestAddress = (span) => ({
  regime: span.regime,
  section_id: span.section_id,
  span_id: span.span_id,
});

// A slot_bound span IS a projected section with an address: delegate verbatim.
export function contestSlotSpan({ capsuleBundle, span, contest, artifacts, ctx }) {
  const cls = PARTITIONS[span.regime]?.[span.section_id];
  const op = (capsuleBundle.content.projected_sections ?? []).find(
    (p) => p.regime === span.regime && p.section_id === span.section_id
  );
  return deriveSectionStatus({
    contest: { ...contest, regime: span.regime, section_id: span.section_id },
    cls,
    operatorValue: op?.value,
    artifacts,
    ctx,
  });
}

// Prose spans: classification contests only — recorded, never recomputed
// ("nobody recomputes a vibes sentence", spec §1 Law 2).
export function contestProseSpanClassification({ span_id, judgment_text_digest }) {
  return {
    status: "DISPUTE_RECORDED",
    kind: "classification_contest",
    span_id,
    judgment_text_digest,
  };
}
