// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S Annex — the SOLE raw-code allocator for VWQ.
//
// TABLE LOOKUP, NEVER ARITHMETIC. There is no `VWQ_BAND_LO + index` and no offset from a check
// number. 5P's allocator says why in its own header and it is worth repeating here, because this
// band is the largest the repository has issued at once: an arithmetic map silently re-numbers every
// later row the moment one is inserted, which is exactly the ripple that reddened CI on 4R and 4S.
// The band is closed at 512; a new outcome takes 513+ by amendment and existing codes never move.
//
// A raw code identifies a REJECTION. `VWQ_EQUIVOCATION_DETECTED` is deliberately absent: a detected
// fork is a FINDING about a producer, not a failure of the verifier, and it exits 0. Giving it a code
// here would make the stage's central success look like an error to every caller reading exit status.
//
// The rows below are the frozen §2.7 allocation. A test parses §2.7 and asserts equality, so the spec
// stays authority and this file stays a transcription of it.

import { VSI_ALLOCATED_HI } from "../../stage5p/core/rawCodeAllocator.mjs";

/** One above 5P's high-water mark. Imported, never retyped — a copied constant is a future lie. */
export const VWQ_BAND_LO = VSI_ALLOCATED_HI + 1;
export const VWQ_BAND_HI = 512;

/** The canonical allocation table, in frozen first-failure check order (spec §2.8). */
export const VWQ_CLOSED_BAND = Object.freeze(
  [
    { check_id: "structural", policy_outcome: "SCHEMA_UNSUPPORTED", raw_code: 475 },
    { check_id: "structural", policy_outcome: "CANONICALISATION_UNKNOWN", raw_code: 476 },
    { check_id: "checkpoint+produ.", policy_outcome: "CHECKPOINT_BINDING_MISMATCH", raw_code: 477 },
    { check_id: "checkpoint+produ.", policy_outcome: "PRODUCER_IDENTITY_MALFORMED", raw_code: 478 },
    { check_id: "checkpoint+produ.", policy_outcome: "PRODUCER_SIGNATURE_INVALID", raw_code: 479 },
    { check_id: "checkpoint+produ.", policy_outcome: "C1_COMMITMENT_UNBOUND", raw_code: 480 },
    { check_id: "checkpoint+produ.", policy_outcome: "PROTOCOL_VERSION_MISMATCH", raw_code: 481 },
    { check_id: "checkpoint+produ.", policy_outcome: "EPOCH_INVALID", raw_code: 482 },
    { check_id: "checkpoint+produ.", policy_outcome: "HISTORY_ROOT_MISMATCH", raw_code: 483 },
    { check_id: "witness policy", policy_outcome: "POLICY_NOT_COMMITTED", raw_code: 484 },
    {
      check_id: "witness policy",
      policy_outcome: "POLICY_MALFORMED_OR_ROSTER_INVALID",
      raw_code: 485,
    },
    { check_id: "witness policy", policy_outcome: "POLICY_DIGEST_MISMATCH", raw_code: 486 },
    { check_id: "witness policy", policy_outcome: "PRODUCER_KEY_NOT_COMMITTED", raw_code: 487 },
    { check_id: "witness identity", policy_outcome: "WITNESS_IDENTITY_MALFORMED", raw_code: 488 },
    { check_id: "witness identity", policy_outcome: "WITNESS_NOT_IN_ROSTER", raw_code: 489 },
    { check_id: "witness identity", policy_outcome: "WITNESS_SIGNATURE_INVALID", raw_code: 490 },
    { check_id: "laundering", policy_outcome: "PRODUCER_SELF_WITNESS", raw_code: 491 },
    { check_id: "laundering", policy_outcome: "WITNESS_KEY_ALIASED", raw_code: 492 },
    { check_id: "laundering", policy_outcome: "WITNESS_DUPLICATE", raw_code: 493 },
    { check_id: "replay", policy_outcome: "CROSS_EPOCH_REPLAY", raw_code: 494 },
    { check_id: "replay", policy_outcome: "CROSS_SCOPE_REPLAY", raw_code: 495 },
    { check_id: "quorum", policy_outcome: "QUORUM_BELOW_POLICY", raw_code: 496 },
    {
      check_id: "comparison policy",
      policy_outcome: "COMPARISON_POLICY_NOT_COMMITTED",
      raw_code: 497,
    },
    {
      check_id: "comparison policy",
      policy_outcome: "COMPARISON_POLICY_MALFORMED_OR_ROSTER_INVALID",
      raw_code: 498,
    },
    {
      check_id: "comparison policy",
      policy_outcome: "COMPARISON_POLICY_DIGEST_MISMATCH",
      raw_code: 499,
    },
    { check_id: "receiver", policy_outcome: "RECEIVER_IDENTITY_MALFORMED", raw_code: 500 },
    { check_id: "receiver", policy_outcome: "RECEIVER_NOT_IN_COMPARISON_ROSTER", raw_code: 501 },
    { check_id: "receiver", policy_outcome: "RECEIVER_RECEIPT_SIGNATURE_INVALID", raw_code: 502 },
    { check_id: "receiver", policy_outcome: "RECEIVER_KEY_ALIASED", raw_code: 503 },
    { check_id: "receiver", policy_outcome: "RECEIVER_DUPLICATE", raw_code: 504 },
    { check_id: "receiver", policy_outcome: "RECEIVER_STATUS_MALFORMED", raw_code: 505 },
    { check_id: "receiver", policy_outcome: "RECEIVER_STATUS_SIGNATURE_INVALID", raw_code: 506 },
    { check_id: "comparison", policy_outcome: "COMPARISON_MANIFEST_NOT_COMMITTED", raw_code: 507 },
    { check_id: "comparison", policy_outcome: "COMPARISON_SET_INSUFFICIENT", raw_code: 508 },
    { check_id: "comparison", policy_outcome: "ANCESTRY_PROOF_INVALID", raw_code: 509 },
    { check_id: "comparison", policy_outcome: "EQUIVOCATION_ARTIFACT_INVALID", raw_code: 510 },
    { check_id: "claim gate", policy_outcome: "NONEQUIVOCATION_OVERCLAIM", raw_code: 511 },
    { check_id: "wrapper", policy_outcome: "VWQ_UNKNOWN", raw_code: 512 },
  ].map(Object.freeze)
);

const BY_OUTCOME = new Map(VWQ_CLOSED_BAND.map((r) => [r.policy_outcome, r.raw_code]));
const BY_CODE = new Map(VWQ_CLOSED_BAND.map((r) => [r.raw_code, r.policy_outcome]));

/** @returns {number|null} the raw code for an outcome, or null — never a guess. */
export function codeFor(policyOutcome) {
  return BY_OUTCOME.get(policyOutcome) ?? null;
}

/** @returns {string|null} the outcome for a raw code, or null. */
export function outcomeFor(rawCode) {
  return BY_CODE.get(rawCode) ?? null;
}
