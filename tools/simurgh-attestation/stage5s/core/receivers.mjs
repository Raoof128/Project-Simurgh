// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the receiver lane and intake tiers (§2.1, §2.6, §2.8).
//
// AUTHORITY IS NEVER SELF-CONFERRED. A comparator cannot authorise its own receivers, so the roster
// lives in `comparison_policy`. A roster authored by the comparator being checked proves nothing
// about the comparator being checked.
//
// 499 IS NOT 502 (§13, E5). A receipt whose signature verifies but binds the wrong comparison policy
// is not a signature failure — the receiver is honest and the comparator is asking about a different
// comparison. It takes 499 with BOTH digests printed. 502 means the signature did not verify.
//
// COLLAPSE OVER AUTHENTICATED PROVENANCE, NEVER ARRAY POSITION. The identity that counts is the one
// inside the signed material; deduplicating by index lets one receipt submitted twice report two
// receivers, and two receivers is the threshold for this stage's strongest green.
//
// THE TWO GATES DO NOT SHADOW EACH OTHER. Roster SHAPE is judged when the policy is validated (498);
// key COLLAPSE is judged when the views arrive (503). Folding the second into the first would make
// 503 dead code, and a dead refusal is a refusal nobody can trust.
//
// AN UNAVAILABLE STATUS COUNTS FOR INTAKE AND NOTHING ELSE. It carries no view, no receiver weight,
// no corroboration. A signed absence that could become a synthetic observation would be an
// attendance record casting a vote.

/** Every refusal the receiver lane can emit. Each allocates a code in 497..506. */
export const RECEIVER_REFUSALS = Object.freeze({
  POLICY_NOT_COMMITTED: "COMPARISON_POLICY_NOT_COMMITTED",
  POLICY_MALFORMED_OR_ROSTER_INVALID: "COMPARISON_POLICY_MALFORMED_OR_ROSTER_INVALID",
  POLICY_DIGEST_MISMATCH: "COMPARISON_POLICY_DIGEST_MISMATCH",
  IDENTITY_MALFORMED: "RECEIVER_IDENTITY_MALFORMED",
  NOT_IN_ROSTER: "RECEIVER_NOT_IN_COMPARISON_ROSTER",
  RECEIPT_SIGNATURE_INVALID: "RECEIVER_RECEIPT_SIGNATURE_INVALID",
  KEY_ALIASED: "RECEIVER_KEY_ALIASED",
  DUPLICATE: "RECEIVER_DUPLICATE",
  STATUS_MALFORMED: "RECEIVER_STATUS_MALFORMED",
  STATUS_SIGNATURE_INVALID: "RECEIVER_STATUS_SIGNATURE_INVALID",
});

const R = RECEIVER_REFUSALS;
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const EMPTY_INTAKE = Object.freeze({
  views: Object.freeze([]),
  distinct_committed_receivers: 0,
  sufficient_for_comparison: false,
  intake_complete: false,
  silent_receivers: Object.freeze([]),
});

/** §2.1 required fields of a `receiver_unavailable_status`, minus the ones checked as identity. */
const STATUS_FIELDS = Object.freeze(["expected_coordinate", "receiver_sequence", "reason_code"]);

/**
 * Judge the receiver lane and compute intake completeness. Pure; never throws.
 *
 * @param {{policy: object, receipts?: Array<object>, statuses?: Array<object>}} input
 * @returns {{ok: boolean, refusals: Array<{reason: string, detail?: string}>, intake: object}}
 */
export function intake(input) {
  const { policy, receipts, statuses } = input ?? {};
  const stop = (refusals) => ({ ok: false, refusals, intake: EMPTY_INTAKE });

  // ---- comparison policy committed (497) -----------------------------------------------------
  if (!isPlainObject(policy)) return stop([{ reason: R.POLICY_NOT_COMMITTED }]);

  // ---- comparison policy shape and roster (498) ----------------------------------------------
  const roster = policy.comparison_roster;
  const shape = [];
  const bad = (detail) => shape.push({ reason: R.POLICY_MALFORMED_OR_ROSTER_INVALID, detail });

  if (!isNonEmptyString(policy.comparison_policy_digest)) bad("comparison_policy_digest is absent");
  if (!Array.isArray(roster) || roster.length === 0) {
    bad("comparison_roster is absent or empty");
  } else {
    const seen = new Set();
    for (const [i, seat] of roster.entries()) {
      if (!isPlainObject(seat) || !isNonEmptyString(seat.receiver_identity)) {
        bad(`roster seat ${i} carries no receiver_identity`);
        continue;
      }
      if (!isNonEmptyString(seat.key_digest))
        bad(`roster seat ${seat.receiver_identity}: key_digest`);
      if (seen.has(seat.receiver_identity))
        bad(`duplicate roster identity ${seat.receiver_identity}`);
      seen.add(seat.receiver_identity);
    }
  }
  if (shape.length) return stop(shape);

  const committedDigest = policy.comparison_policy_digest;
  const submissions = [
    ...(Array.isArray(receipts) ? receipts : []).map((v) => ({ kind: "receipt", v })),
    ...(Array.isArray(statuses) ? statuses : []).map((v) => ({ kind: "status", v })),
  ];

  // ---- the comparison policy each submission binds (499) --------------------------------------
  // Ordered here, before every receiver check, because the frozen order puts the comparison-policy
  // group ahead of the receiver group — and because a submission about another comparison should
  // never be judged as a bad receiver.
  const wrongPolicy = submissions
    .filter((s) => isPlainObject(s.v) && s.v.comparison_policy_digest !== committedDigest)
    .map((s) => ({
      reason: R.POLICY_DIGEST_MISMATCH,
      detail:
        `${String(s.v.receiver_identity)} bound ${String(s.v.comparison_policy_digest)}, ` +
        `and the committed comparison policy is ${committedDigest}`,
    }));
  if (wrongPolicy.length) return stop(wrongPolicy);

  // ---- receiver identity (500) -----------------------------------------------------------------
  const malformed = submissions
    .filter(
      (s) =>
        !isPlainObject(s.v) ||
        !isNonEmptyString(s.v.receiver_identity) ||
        !isNonEmptyString(s.v.receiver_key_digest)
    )
    .map((s) => ({ reason: R.IDENTITY_MALFORMED, detail: `${s.kind} ${JSON.stringify(s.v)}` }));
  if (malformed.length) return stop(malformed);

  // ---- roster membership (501) ------------------------------------------------------------------
  // Membership is the (identity, key) PAIR, as in the witness lane: a name over a key the roster
  // never committed is not a roster receiver. One submission under a foreign key aliases nothing —
  // nothing is wearing two names yet — so this is 501, and 503 keeps its own distinct meaning.
  const seatOf = new Map(roster.map((seat) => [seat.receiver_identity, seat]));
  const strangers = [];
  for (const s of submissions) {
    const seat = seatOf.get(s.v.receiver_identity);
    if (!seat) {
      strangers.push({
        reason: R.NOT_IN_ROSTER,
        detail: `${s.v.receiver_identity} holds no seat in the committed comparison roster`,
      });
    } else if (seat.key_digest !== s.v.receiver_key_digest) {
      strangers.push({
        reason: R.NOT_IN_ROSTER,
        detail:
          `${s.v.receiver_identity} signed under ${s.v.receiver_key_digest}, ` +
          `and its seat commits ${seat.key_digest}`,
      });
    }
  }
  if (strangers.length) return stop(strangers);

  // ---- receipt signature (502) ------------------------------------------------------------------
  const unverified = submissions
    .filter((s) => s.kind === "receipt" && s.v.signature_verified !== true)
    .map((s) => ({
      reason: R.RECEIPT_SIGNATURE_INVALID,
      detail: `${s.v.receiver_identity}: receipt signature was not verified`,
    }));
  if (unverified.length) return stop(unverified);

  // ---- key collapse (503) -----------------------------------------------------------------------
  // One key holding two seats is one receiver holding two votes. `validateComparisonPolicy` is not
  // the only thing standing between that roster and a clean verdict — this check is independent of
  // it, and stays live even over a roster that was never validated.
  const aliased = [];
  const identitiesByKey = new Map();
  for (const s of submissions) {
    const key = s.v.receiver_key_digest;
    if (!identitiesByKey.has(key)) identitiesByKey.set(key, new Set());
    identitiesByKey.get(key).add(s.v.receiver_identity);
  }
  for (const [key, ids] of identitiesByKey) {
    if (ids.size > 1) {
      aliased.push({
        reason: R.KEY_ALIASED,
        detail: `key ${key} carries ${ids.size} receiver identities: ${[...ids].join(", ")}`,
      });
    }
  }
  if (aliased.length) return stop(aliased);

  // ---- duplicate over authenticated provenance (504) -------------------------------------------
  const answers = new Map();
  for (const s of submissions) {
    answers.set(s.v.receiver_identity, (answers.get(s.v.receiver_identity) ?? 0) + 1);
  }
  const duplicates = [...answers]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({
      reason: R.DUPLICATE,
      detail: `${id} answered ${n} times; a receiver has one answer`,
    }));
  if (duplicates.length) return stop(duplicates);

  // ---- unavailable statuses (505, 506) ----------------------------------------------------------
  const statusMalformed = [];
  for (const s of submissions.filter((x) => x.kind === "status")) {
    for (const field of STATUS_FIELDS) {
      if (s.v[field] === undefined || s.v[field] === null) {
        statusMalformed.push({
          reason: R.STATUS_MALFORMED,
          detail: `${s.v.receiver_identity}: ${field}`,
        });
      }
    }
    // Absence must stay absent: a status carrying view payload is a synthetic observation.
    if ("view" in s.v || "checkpoint" in s.v || "checkpoint_envelope_digest" in s.v) {
      statusMalformed.push({
        reason: R.STATUS_MALFORMED,
        detail: `${s.v.receiver_identity}: a signed absence carries a view payload`,
      });
    }
  }
  if (statusMalformed.length) return stop(statusMalformed);

  const statusUnsigned = submissions
    .filter((s) => s.kind === "status" && s.v.signature_verified !== true)
    .map((s) => ({
      reason: R.STATUS_SIGNATURE_INVALID,
      detail: `${s.v.receiver_identity}: unavailable-status signature was not verified`,
    }));
  if (statusUnsigned.length) return stop(statusUnsigned);

  // ---- intake ------------------------------------------------------------------------------------
  // SET-CANONICAL, not submission-canonical. §2.1 commits the comparison manifest to set-canonical
  // input digests, so the view list is ordered by authenticated identity rather than by the order a
  // comparator happened to hand them over. Otherwise shuffling the array changes a downstream digest.
  const views = submissions
    .filter((s) => s.kind === "receipt")
    .map((s) => s.v)
    .sort((x, y) => (x.receiver_identity < y.receiver_identity ? -1 : 1));
  const accountedFor = new Set(submissions.map((s) => s.v.receiver_identity));
  const silent = roster.map((seat) => seat.receiver_identity).filter((id) => !accountedFor.has(id));

  return {
    ok: true,
    refusals: [],
    intake: Object.freeze({
      views: Object.freeze([...views]),
      // A signed absence is accounted for, and it is not a receiver with a view.
      distinct_committed_receivers: views.length,
      sufficient_for_comparison: views.length >= 2,
      intake_complete: silent.length === 0,
      silent_receivers: Object.freeze(silent),
    }),
  };
}
