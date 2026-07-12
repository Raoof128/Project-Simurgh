// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC committed roots. All are canonical digests over sorted member digests so a producer
// cannot reorder to change the commitment.
import { artifactDigest } from "./digests.mjs";

// rating_obligation_root commits the DERIVED obligations (reviewer pairs = C(r), producer sections = S)
// — what the producer must have declared. Recomputed from the verified 5I coverage relation.
export function ratingObligationRoot(ctx) {
  return artifactDigest({
    required_reviewer_pairs: [...ctx.requiredReviewerPairs].sort(),
    required_producer_sections: [...ctx.S].sort(),
  });
}

// rating_ledger_root commits both append-only rating chains (Task 1.14 / attestation).
export function ratingLedgerRoot(bundle) {
  return artifactDigest({
    reviewer: bundle.reviewer_ratings.map((e) => e.entry_digest).sort(),
    producer: bundle.producer_ratings.map((e) => e.entry_digest).sort(),
  });
}

// contest_layer_root commits the events AND their discharge records (responses/concurrences/rebuttals)
// plus the epoch tickets — so the discharge obligations cannot be silently dropped (Task 1.14).
export function contestLayerRoot(bundle) {
  return artifactDigest({
    epoch_tickets: bundle.epoch_tickets.map((t) => t.epoch_ticket_digest),
    contest_history: bundle.contest_history.map((c) => c.contest_event_digest).sort(),
    producer_responses: bundle.producer_responses.map((r) => r.response_digest).sort(),
    concurrences: bundle.concurrences.map((c) => c.concurrence_digest).sort(),
    reviewer_rebuttals: bundle.reviewer_rebuttals.map((r) => r.rebuttal_digest).sort(),
  });
}
