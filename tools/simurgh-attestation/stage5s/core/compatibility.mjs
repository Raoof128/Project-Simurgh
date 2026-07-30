// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the compatibility relation of spec §2.4, frozen.
//
//   body digests equal                                       → same_checkpoint
//   same (producer, scope, epoch) and bodies differ          → incompatible
//   different epochs, valid authorised transitive ancestry   → compatible
//   different epochs, neither a valid ancestor of the other  → incompatible
//   ancestry unprovable from the committed inputs            → indeterminate
//
// BODIES, NEVER ENVELOPES. Witness statements and receipts bind the envelope, because they attest to
// a signed object. Compatibility compares the body, because it asks what was COMMITTED. Two valid
// signatures over identical content may differ in envelope bytes; if that read as a fork, the stage
// would manufacture the false accusation §5.3 obliges it to deny.
//
// INDETERMINATE IS A DETERMINISTIC OUTCOME, NOT A SOFT FAILURE. It is what an honest verifier says
// when the committed record is valid but short. Failing closed here would accuse a producer of
// forking because OUR inputs were incomplete, which inverts this project's honesty rule.
//
// THE ANCESTRY ORACLE IS INJECTED. `core/ancestry.mjs` supplies the real one; this module never
// imports it, so the relation stays testable against every verdict including ones the real prover
// cannot yet produce. The default oracle answers `unprovable`, which is the only answer available to
// a caller who committed no ancestry material.

/** The frozen four of §2.4. A fifth outcome would breach the §2 freeze. */
export const RELATIONS = Object.freeze([
  "same_checkpoint",
  "incompatible",
  "compatible",
  "indeterminate",
]);

export const COMPATIBILITY_REFUSALS = Object.freeze({
  SCHEMA_UNSUPPORTED: "SCHEMA_UNSUPPORTED", // 475
  CHECKPOINT_BINDING_MISMATCH: "CHECKPOINT_BINDING_MISMATCH", // 477
  COMPARISON_SET_INSUFFICIENT: "COMPARISON_SET_INSUFFICIENT", // 508
  ANCESTRY_PROOF_INVALID: "ANCESTRY_PROOF_INVALID", // 509
});

/** The two clean members. Named once so no caller re-derives "clean" from a relation string. */
const CLEAN = Object.freeze(new Set(["same_checkpoint", "compatible"]));

/** @param {string} relation */
export function isClean(relation) {
  return CLEAN.has(relation);
}

const REQUIRED = Object.freeze([
  "producer_identity",
  "scope_id",
  "epoch",
  "checkpoint_body_digest",
  "checkpoint_envelope_digest",
  "history_root",
]);

const refuse = (reason, detail) => ({ ok: false, refusal: { reason, detail } });
const relate = (relation) => ({ ok: true, relation });

function malformed(v) {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return "not an object";
  // §7.3 case 2: a document projection submitted in a checkpoint slot is a MISUSE that would
  // manufacture `false_equivocation`. It is refused, never compared.
  if (v.artifact_kind !== "checkpoint") return `artifact_kind is ${String(v.artifact_kind)}`;
  for (const field of REQUIRED) {
    if (v[field] === undefined || v[field] === null) return `missing ${field}`;
  }
  if (!Number.isInteger(v.epoch) || v.epoch < 0) return "epoch is not a non-negative integer";
  return null;
}

/**
 * Decide the §2.4 relation between two committed checkpoint views. Pure; never throws.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @param {{ancestry?: (earlier: object, later: object) => {verdict: string}}} [opts]
 * @returns {{ok: true, relation: string}|{ok: false, refusal: {reason: string, detail?: string}}}
 */
export function compare(a, b, opts = {}) {
  const R = COMPATIBILITY_REFUSALS;

  for (const [label, v] of [
    ["a", a],
    ["b", b],
  ]) {
    const why = malformed(v);
    if (why) return refuse(R.SCHEMA_UNSUPPORTED, `view ${label}: ${why}`);
  }

  // The fork coordinate is (producer_identity, scope_id, epoch). Two views that disagree on the
  // first two components are not two versions of one history — they are two histories, and no fork
  // claim is available over either. Insufficient, not incompatible: accusing unrelated producers of
  // equivocating with each other is precisely the §5.3 win this stage must deny.
  if (a.producer_identity !== b.producer_identity || a.scope_id !== b.scope_id) {
    return refuse(
      R.COMPARISON_SET_INSUFFICIENT,
      `views share no fork-coordinate prefix: (${a.producer_identity}, ${a.scope_id}) vs ` +
        `(${b.producer_identity}, ${b.scope_id})`
    );
  }

  if (a.checkpoint_body_digest === b.checkpoint_body_digest) {
    // The body digest covers the history root, so equal bodies with different roots is a
    // self-inconsistent pair that should already have been refused at 477. Re-checking is
    // fail-closed; it can only fire on input the frozen order would have stopped earlier.
    if (a.history_root !== b.history_root) {
      return refuse(
        R.CHECKPOINT_BINDING_MISMATCH,
        "equal body digests bind different history roots"
      );
    }
    return relate("same_checkpoint");
  }

  if (a.epoch === b.epoch) return relate("incompatible");

  const [earlier, later] = a.epoch < b.epoch ? [a, b] : [b, a];
  const ancestry = typeof opts.ancestry === "function" ? opts.ancestry : () => UNPROVABLE;

  let answer;
  try {
    answer = ancestry(earlier, later);
  } catch {
    // An oracle that throws has told us nothing, and "nothing" is indeterminate — not a fork.
    return relate("indeterminate");
  }

  switch (answer?.verdict) {
    case "proven":
      return relate("compatible");
    case "not_ancestor":
      return relate("incompatible");
    case "invalid":
      return refuse(R.ANCESTRY_PROOF_INVALID, answer.detail);
    default:
      // Every unrecognised verdict lands here. An oracle cannot widen the frozen four by inventing
      // a word, and an unknown answer is an absent answer.
      return relate("indeterminate");
  }
}

const UNPROVABLE = Object.freeze({ verdict: "unprovable" });
