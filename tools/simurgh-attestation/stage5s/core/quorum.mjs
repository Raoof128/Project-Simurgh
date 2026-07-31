// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — quorum arithmetic and laundering collapse.
//
// THE ORDER IS THE MECHANISM. §2.8 freezes it, and two adjacencies here are load-bearing:
//
//   witness identity  →  laundering  →  replay  →  quorum
//   488 489 490          491 492 493     494 495     496
//
// PRODUCER EXCLUSION (491) PRECEDES ALIAS/DUPLICATE COLLAPSE (492/493). Collapse first and a producer
// holding two roster seats over its own key spends both on the alias check, gets merged into one
// identity, and then walks past self-witness looking like a single ordinary witness. Excluding the
// producer first deletes its seats before anything is merged. The tests state the attack.
//
// ROSTER MEMBERSHIP IS IDENTITY ELIGIBILITY, THEN KEY OWNERSHIP (5S-F010):
//
//   identity malformed                                        → 488
//   identity absent from the roster                           → 489
//   identity present, key is that identity's committed key     → continue
//   identity present, key belongs to ANOTHER roster identity   → 492
//   identity present, key belongs to no roster identity        → 489
//
//   489 = no authorised roster binding exists for this submission
//   492 = an authorised roster key is being worn by the wrong authorised identity
//
// The first version asked one question — is `(identity, key)` a committed pair — and answered 489 to
// every no. Sound, and the wrong diagnosis: it collapsed two events into one code, and made 492
// unreachable, because the only other route to an alias is a roster sharing a key across two seats,
// which the policy validator refuses at 485 six codes earlier. Nothing is weakened by the split. A
// stranger identity still takes 489 and a key nobody owns still takes 489; matching the name alone
// would still let any key sign as anybody, and it does not.
//
// FAIL-CLOSED ON AN UNSEEN SIGNATURE. A statement that never passed a signature check is
// indistinguishable here from one that failed it, so `signature_verified !== true` — including
// absent — is refused at 490. The tally will not assume a check it did not watch happen.
//
// IT RETURNS ARITHMETIC, NEVER A STATUS. `quorum_status` is one of the five Task 13 functions, and a
// module that named its own verdict would be issuing one it has no authority to issue.

import { classOf } from "./classes.mjs";

/** Every refusal the tally can emit. Each allocates a code in 488..496. */
export const QUORUM_REFUSALS = Object.freeze({
  WITNESS_IDENTITY_MALFORMED: "WITNESS_IDENTITY_MALFORMED",
  WITNESS_NOT_IN_ROSTER: "WITNESS_NOT_IN_ROSTER",
  WITNESS_SIGNATURE_INVALID: "WITNESS_SIGNATURE_INVALID",
  PRODUCER_SELF_WITNESS: "PRODUCER_SELF_WITNESS",
  WITNESS_KEY_ALIASED: "WITNESS_KEY_ALIASED",
  WITNESS_DUPLICATE: "WITNESS_DUPLICATE",
  CROSS_EPOCH_REPLAY: "CROSS_EPOCH_REPLAY",
  CROSS_SCOPE_REPLAY: "CROSS_SCOPE_REPLAY",
  QUORUM_BELOW_POLICY: "QUORUM_BELOW_POLICY",
});

const R = QUORUM_REFUSALS;
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;

const emptyTally = (threshold) =>
  Object.freeze({
    distinct_eligible_witnesses: 0,
    by_class: Object.freeze({}),
    threshold_q: threshold,
    met: false,
  });

/**
 * Count the witnesses a checkpoint actually has, under the committed policy. Pure; never throws.
 *
 * @param {{checkpoint: object, policy: object, statements: Array<object>,
 *          producer_key_digest?: string}} input
 * @returns {{ok: boolean, refusals: Array<{reason: string, detail?: string}>, tally: object}}
 */
export function tally(input) {
  const { checkpoint, policy, statements, producer_key_digest } = input ?? {};
  const threshold = policy?.threshold_q;
  const roster = Array.isArray(policy?.witness_roster) ? policy.witness_roster : [];
  const list = Array.isArray(statements) ? statements : [];
  const mix = policy?.required_class_mix ?? {};

  /** Return the first group that produced refusals; later groups never run. */
  const stop = (refusals) => ({ ok: false, refusals, tally: emptyTally(threshold) });

  // ---- structural identity (488) ------------------------------------------------------------
  const malformed = list
    .filter(
      (s) =>
        s === null ||
        typeof s !== "object" ||
        Array.isArray(s) ||
        !isNonEmptyString(s.witness_identity) ||
        !isNonEmptyString(s.key_digest)
    )
    .map((s) => ({
      reason: R.WITNESS_IDENTITY_MALFORMED,
      detail: `statement ${JSON.stringify(s)}`,
    }));
  if (malformed.length) return stop(malformed);

  // ---- signature (490) ----------------------------------------------------------------------
  const unverified = list
    .filter((s) => s.signature_verified !== true)
    .map((s) => ({
      reason: R.WITNESS_SIGNATURE_INVALID,
      detail: `${s.witness_identity}: signature was not verified`,
    }));
  if (unverified.length) return stop(unverified);

  // ---- roster membership: identity eligibility, then KEY OWNERSHIP (489 / 492) ---------------
  //
  // The first version of this block asked one question — is `(identity, key)` a committed pair — and
  // answered 489 to every no. That is sound and it is the wrong diagnosis, because it collapses two
  // different events into one code and makes the second unreportable:
  //
  //   489  no authorised roster binding exists for this submission
  //   492  an authorised roster key is being worn by the WRONG authorised identity
  //
  // Collapsing them also made 492 unreachable as a first failure, because the only other route to it
  // is a roster sharing one key across two seats, which the policy validator refuses at 485 six codes
  // earlier (5S-F010). Nothing here is weakened: a key no roster identity owns still takes 489, and
  // a stranger identity still takes 489. Only the sentence changes, and it changes to the true one.
  //
  // The alias is recorded and carried past producer exclusion rather than raised here, because 492
  // lives in the laundering group and 491 precedes it — a producer holding two seats must be caught
  // as a producer before it is described as an alias.
  const seatOf = new Map(
    roster
      .filter((e) => e && isNonEmptyString(e.witness_identity))
      .map((e) => [e.witness_identity, e])
  );
  const identityOwningKey = new Map(
    roster
      .filter((e) => e && isNonEmptyString(e.witness_identity) && isNonEmptyString(e.key_digest))
      .map((e) => [e.key_digest, e.witness_identity])
  );
  const strangers = [];
  const wornByWrongIdentity = [];
  for (const s of list) {
    const seat = seatOf.get(s.witness_identity);
    if (!seat) {
      strangers.push({
        reason: R.WITNESS_NOT_IN_ROSTER,
        detail: `${s.witness_identity} holds no roster seat`,
      });
      continue;
    }
    if (seat.key_digest === s.key_digest) continue;

    const owner = identityOwningKey.get(s.key_digest);
    if (owner === undefined) {
      strangers.push({
        reason: R.WITNESS_NOT_IN_ROSTER,
        detail:
          `${s.witness_identity} signed under ${s.key_digest}, ` + `which no roster identity owns`,
      });
    } else {
      wornByWrongIdentity.push({
        reason: R.WITNESS_KEY_ALIASED,
        detail:
          `${s.witness_identity} signed under the key the roster commits to ${owner} ` +
          `(its own seat commits ${seat.key_digest})`,
      });
    }
  }
  if (strangers.length) return stop(strangers);

  // ---- laundering: producer exclusion FIRST (491) --------------------------------------------
  const selfWitness = list
    .filter(
      (s) =>
        s.witness_identity === checkpoint?.producer_identity ||
        (isNonEmptyString(producer_key_digest) && s.key_digest === producer_key_digest)
    )
    .map((s) => ({
      reason: R.PRODUCER_SELF_WITNESS,
      detail: `${s.witness_identity} signs with the producer's identity or key`,
    }));
  if (selfWitness.length) return stop(selfWitness);

  // ---- laundering: alias (492), then duplicate (493) ------------------------------------------
  const identitiesByKey = new Map();
  for (const s of list) {
    if (!identitiesByKey.has(s.key_digest)) identitiesByKey.set(s.key_digest, new Set());
    identitiesByKey.get(s.key_digest).add(s.witness_identity);
  }
  const aliased = [
    // Submission-level: one identity wearing another authorised identity's key, carried down from
    // the membership decision above.
    ...wornByWrongIdentity,
    // Set-level: two identities arriving on one key at once. Kept as defence in depth — the policy
    // validator refuses such a roster at 485, and this catches it again if one arrives anyway.
    ...[...identitiesByKey]
      .filter(([, ids]) => ids.size > 1)
      .map(([key, ids]) => ({
        reason: R.WITNESS_KEY_ALIASED,
        detail: `key ${key} carries ${ids.size} identities: ${[...ids].join(", ")}`,
      })),
  ];
  if (aliased.length) return stop(aliased);

  const counts = new Map();
  for (const s of list) counts.set(s.witness_identity, (counts.get(s.witness_identity) ?? 0) + 1);
  const duplicates = [...counts]
    .filter(([, n]) => n > 1)
    .map(([id, n]) => ({ reason: R.WITNESS_DUPLICATE, detail: `${id} appears ${n} times` }));
  if (duplicates.length) return stop(duplicates);

  // ---- replay (494, 495) ----------------------------------------------------------------------
  const crossEpoch = list
    .filter((s) => s.epoch !== checkpoint?.epoch)
    .map((s) => ({
      reason: R.CROSS_EPOCH_REPLAY,
      detail: `${s.witness_identity} witnessed epoch ${s.epoch}, checkpoint is ${checkpoint?.epoch}`,
    }));
  if (crossEpoch.length) return stop(crossEpoch);

  const crossScope = list
    .filter((s) => s.scope_id !== checkpoint?.scope_id)
    .map((s) => ({
      reason: R.CROSS_SCOPE_REPLAY,
      detail: `${s.witness_identity} witnessed ${s.scope_id}, checkpoint is ${checkpoint?.scope_id}`,
    }));
  if (crossScope.length) return stop(crossScope);

  // ---- quorum (496) --------------------------------------------------------------------------
  const byClass = {};
  for (const s of list) {
    const seat = seatOf.get(s.witness_identity);
    // An unrecognised class is counted under `unresolved`: it establishes nothing, which is exactly
    // what an unrecognised class establishes. It is never counted toward a stronger class.
    const cls =
      classOf(seat?.witness_operator_class) === "witness_operator"
        ? seat.witness_operator_class
        : "unresolved";
    byClass[cls] = (byClass[cls] ?? 0) + 1;
  }

  const distinct = counts.size;
  const shortfalls = [];
  if (!Number.isInteger(threshold) || distinct < threshold) {
    shortfalls.push({
      reason: R.QUORUM_BELOW_POLICY,
      detail: `${distinct} distinct eligible witnesses against threshold_q ${threshold}`,
    });
  }
  for (const [cls, required] of Object.entries(mix)) {
    if ((byClass[cls] ?? 0) < required) {
      shortfalls.push({
        reason: R.QUORUM_BELOW_POLICY,
        detail: `class ${cls}: ${byClass[cls] ?? 0} present, ${required} required`,
      });
    }
  }

  const result = Object.freeze({
    distinct_eligible_witnesses: distinct,
    by_class: Object.freeze({ ...byClass }),
    threshold_q: threshold,
    met: shortfalls.length === 0,
  });
  return shortfalls.length
    ? { ok: false, refusals: shortfalls, tally: result }
    : { ok: true, refusals: [], tally: result };
}
