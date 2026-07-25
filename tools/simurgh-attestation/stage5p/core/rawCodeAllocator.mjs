// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Annex R — the SOLE raw-code allocator.
//
// Sections 2-5 are frozen at 8f9733b1 and stay symbolic: `section2Verifier.mjs` never learns a
// number. This module is the numbering layer that sits outside it, and it is the ONLY place a Stage
// 5P raw code is decided. The CLI or an outer result wrapper calls it; nothing else does.
//
// TABLE LOOKUP, NEVER ARITHMETIC. There is no `464 + index` and no offset from a check number. An
// arithmetic map silently re-numbers every later row the moment one is inserted, which is exactly
// the ripple that reddened CI on 4R and 4S. The band is closed; a new outcome takes 473+ by
// amendment and existing codes never move.
//
// A raw code identifies a REJECTION. It is not a position, a rank, or a strength — Law 1 (No
// Imaginary Ordering) governs this file as it governs the lattice.
import { RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";

/**
 * The canonical allocation table, in frozen first-failure check order.
 *
 * S2.C1 mints no code of its own: a bundle that fails grammar reports `identity_unresolved`, which
 * is allocated once at 470 under the check where the outcome is a SPECIFIC condition rather than a
 * parse failure.
 *
 * Within S2.C8 the internal order is normative — the specific unresolved condition precedes the
 * general incomparable relation. Two outcomes share that check, so check order alone does not
 * determine the band and this tie-break has to be stated rather than inferred.
 */
export const VSI_CLOSED_BAND = Object.freeze(
  [
    { check_id: "S2.C2", policy_outcome: "resolver_binding_invalid", raw_code: 464 },
    { check_id: "S2.C3", policy_outcome: "identity_provider_untrusted", raw_code: 465 },
    { check_id: "S2.C4", policy_outcome: "identity_replay_upgrade_attempted", raw_code: 466 },
    { check_id: "S2.C5", policy_outcome: "identity_principal_mismatch", raw_code: 467 },
    { check_id: "S2.C6", policy_outcome: "identity_claim_mismatch", raw_code: 468 },
    { check_id: "S2.C7", policy_outcome: "accountable_role_unproven", raw_code: 469 },
    { check_id: "S2.C8", policy_outcome: "identity_unresolved", raw_code: 470 },
    { check_id: "S2.C8", policy_outcome: "identity_strength_incomparable", raw_code: 471 },
    { check_id: "S2.C9", policy_outcome: "identity_ephemeral_only", raw_code: 472 },
  ].map(Object.freeze)
);

/**
 * The AMENDMENT BAND — append-only, ordered by MINT SEQUENCE rather than by check order.
 *
 * This is the case Annex R.4 predicted. `resolver_profile_revoked` belongs at S2.C3 and would
 * "logically" sit between 465 and 466 — and it does NOT move there. Existing codes never move, so a
 * later mint appends and the numbering stops being globally check-ordered. Numeric adjacency was
 * always a historical accident of allocation order; the frozen check order is where meaning lives.
 */
export const VSI_AMENDMENT_BAND = Object.freeze(
  [
    {
      check_id: "S2.C3",
      policy_outcome: "resolver_profile_revoked",
      raw_code: 473,
      minted_by: "A5",
    },
    {
      check_id: "S2.C9",
      policy_outcome: "identity_principal_ceased",
      raw_code: 474,
      minted_by: "A5",
    },
  ].map(Object.freeze)
);

/** Every allocated row, closed band first. One code per outcome across BOTH segments. */
export const VSI_ALLOCATION = Object.freeze([...VSI_CLOSED_BAND, ...VSI_AMENDMENT_BAND]);

export const VSI_BAND_LO = 464;
export const VSI_BAND_HI = 472; // the CLOSED band's upper edge; amendments append above it
export const VSI_AMENDMENT_FROM = 473;
export const VSI_ALLOCATED_HI = 474;

/** Success is raw 0. It is deliberately NOT a member of the band and is never allocated. */
export const VSI_OK_RAW = 0;

/**
 * Unknown, missing or contradictory symbols land here — the shared internal-artifact path that 5O
 * also uses as VSC_WRAPPER. The allocator NEVER guesses the nearest band member: an unrecognised
 * pair is an internal defect, and reporting it as a plausible neighbour would launder a bug into a
 * verdict.
 */
export const VSI_FAIL_CLOSED_RAW = RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED;

/**
 * DECLARED ALIASES — additional (check, outcome) emission sites that map into an ALREADY-ALLOCATED
 * code. They mint nothing: the band stays nine codes wide.
 *
 * Why this exists, and why it is not a loophole. `identity_unresolved` is emitted by the frozen
 * verifier at THREE checks, not one:
 *
 *   S2.C1  no evidence presented, or the canonical grammar rejects the bundle
 *   S2.C8  the subject is not present in the derived bank            <- the allocated site, 470
 *   S2.C9  required exceeds actual and the banked identity is NOT ephemeral
 *
 * Allocation is one code per OUTCOME, so all three sites report 470. Without these declarations a
 * strictly pair-keyed lookup would send the two unallocated sites to the internal-artifact code,
 * which would be a false attribution: a malformed submission is an ordinary typed rejection by the
 * caller's input, not evidence that the verifier broke. 29 means "we have a defect" and must keep
 * meaning that.
 *
 * An alias is DECLARED, never inferred. A real check paired with a real outcome that is not an
 * actual emission site remains contradictory and still fails closed — the allocator never resolves
 * through either symbol alone, and never reaches for the nearest neighbour.
 */
export const VSI_PAIR_ALIASES = Object.freeze(
  [
    { check_id: "S2.C1", policy_outcome: "identity_unresolved", raw_code: 470 },
    { check_id: "S2.C9", policy_outcome: "identity_unresolved", raw_code: 470 },
  ].map(Object.freeze)
);

// Keyed on the PAIR. A real check with a real outcome that was never allocated or declared together
// is contradictory, not merely unknown, and must not resolve through either symbol alone.
const BY_PAIR = new Map(
  [...VSI_ALLOCATION, ...VSI_PAIR_ALIASES].map((r) => [
    `${r.check_id}|${r.policy_outcome}`,
    r.raw_code,
  ])
);

/**
 * The raw code for an executed verifier result, or VSI_FAIL_CLOSED_RAW.
 * @param result {{ ok: boolean, check_id?: string, outcome?: string }}
 */
export function rawCodeFor(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return VSI_FAIL_CLOSED_RAW;
  if (result.ok === true) return VSI_OK_RAW;
  if (typeof result.check_id !== "string" || typeof result.outcome !== "string") {
    return VSI_FAIL_CLOSED_RAW;
  }
  const code = BY_PAIR.get(`${result.check_id}|${result.outcome}`);
  return code === undefined ? VSI_FAIL_CLOSED_RAW : code;
}

/**
 * The outer result wrapper — the only supported way a raw code reaches a caller. It ATTACHES a
 * number and changes nothing else, so the symbolic result stays authoritative and the number stays
 * a projection of it.
 */
export function allocateRawCode(result) {
  const raw_code = rawCodeFor(result);
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return Object.freeze({ ok: false, raw_code });
  }
  return Object.freeze({ ...result, raw_code });
}
