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
// ROSTER MEMBERSHIP IS THE (IDENTITY, KEY) PAIR. Matching the name alone would let any key sign as
// anybody, which turns a roster into a list of nicknames.
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

  // ---- roster membership on the (identity, key) pair (489) ----------------------------------
  const seatOf = new Map(
    roster
      .filter((e) => e && isNonEmptyString(e.witness_identity))
      .map((e) => [e.witness_identity, e])
  );
  const strangers = [];
  for (const s of list) {
    const seat = seatOf.get(s.witness_identity);
    if (!seat) {
      strangers.push({
        reason: R.WITNESS_NOT_IN_ROSTER,
        detail: `${s.witness_identity} holds no roster seat`,
      });
    } else if (seat.key_digest !== s.key_digest) {
      strangers.push({
        reason: R.WITNESS_NOT_IN_ROSTER,
        detail:
          `${s.witness_identity} signed under ${s.key_digest}, ` +
          `and the roster commits ${seat.key_digest}`,
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
  const aliased = [...identitiesByKey]
    .filter(([, ids]) => ids.size > 1)
    .map(([key, ids]) => ({
      reason: R.WITNESS_KEY_ALIASED,
      detail: `key ${key} carries ${ids.size} identities: ${[...ids].join(", ")}`,
    }));
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
