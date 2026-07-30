// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — transitive ancestry over the committed record (spec §2.4).
//
// THE ONE-HOP DEFINITION IS WRONG AND THE SPEC SAYS SO. Ancestry is never
// `later.predecessor == earlier.body_digest`; it is a canonical ordered walk, each link
// body → predecessor, with cycle rejection, missing-link rejection, epoch gaps only where policy
// commits `allow_epoch_gaps`, and an authorised transition record for any policy or protocol change
// along the chain.
//
// TWO FAILURE CLASSES, NEVER BLENDED (§13, B4). The question that separates them is whether the
// committed material CONTRADICTS the claim or merely fails to reach it:
//
//   unprovable   the walk ran out of committed material — a missing record, an unpermitted epoch
//                gap, a policy change nobody committed a transition record for. We were handed less
//                than we needed, and saying so is not an accusation.
//   invalid      the material contradicts itself — a cycle, a link whose epoch does not decrease,
//                two records claiming one body digest, or a transition record offered for a pair it
//                does not cover. `compare` turns this into 509 ANCESTRY_PROOF_INVALID.
//
// `not_ancestor` is the third definite answer: the walk terminated at a committed root without
// reaching the earlier view. Nothing was missing; the two views are simply different histories.

/** The four verdicts `compare` understands. Anything else it reads as `unprovable`. */
export const ANCESTRY_VERDICTS = Object.freeze(["proven", "not_ancestor", "unprovable", "invalid"]);

const proven = () => ({ verdict: "proven" });
const notAncestor = (detail) => ({ verdict: "not_ancestor", detail });
const unprovable = (detail) => ({ verdict: "unprovable", detail });
const invalid = (detail) => ({ verdict: "invalid", detail });

const isRecord = (r) =>
  r !== null &&
  typeof r === "object" &&
  !Array.isArray(r) &&
  typeof r.body_digest === "string" &&
  r.body_digest.length > 0 &&
  Number.isInteger(r.epoch);

/**
 * Index the committed chain by body digest, refusing a set that contradicts itself before any walk
 * begins. Two records claiming one body digest make every later answer arbitrary.
 */
function indexChain(chain) {
  const index = new Map();
  for (const record of chain) {
    if (!isRecord(record)) {
      return { error: `malformed chain record: ${JSON.stringify(record)}` };
    }
    if (index.has(record.body_digest)) {
      return { error: `two committed records claim body digest ${record.body_digest}` };
    }
    index.set(record.body_digest, record);
  }
  return { index };
}

/**
 * Is a transition from `from` to `to` of `kind` authorised by a committed record?
 *
 * @returns {"unchanged"|"authorised"|"uncommitted"|"contradicted"}
 */
function transitionState(kind, from, to, records) {
  if (from === to) return "unchanged";
  const forKind = records.filter((r) => r && r.kind === kind);
  if (forKind.length === 0) return "uncommitted";
  return forKind.some((r) => r.from === from && r.to === to) ? "authorised" : "contradicted";
}

/**
 * Decide whether `later` descends from `earlier` over the committed chain. Pure; never throws.
 *
 * @param {object} earlier a checkpoint view, the claimed ancestor
 * @param {object} later a checkpoint view, the claimed descendant
 * @param {{chain?: Array<object>, policy?: {allow_epoch_gaps?: boolean,
 *          transition_records?: Array<object>}}} [committed]
 * @returns {{verdict: string, detail?: string}}
 */
export function proveAncestry(earlier, later, committed = {}) {
  const chain = Array.isArray(committed.chain) ? committed.chain : [];
  const policy = committed.policy ?? {};
  const transitions = Array.isArray(policy.transition_records) ? policy.transition_records : [];

  const { index, error } = indexChain(chain);
  if (error) return invalid(error);

  const target = earlier?.checkpoint_body_digest;
  let currentDigest = later?.checkpoint_body_digest;
  if (typeof target !== "string" || typeof currentDigest !== "string") {
    return unprovable("a view carries no body digest");
  }
  if (currentDigest === target) return proven();

  const seen = new Set();
  let current = index.get(currentDigest);
  if (!current) return unprovable(`no committed record for ${currentDigest}`);

  for (;;) {
    if (seen.has(current.body_digest)) {
      return invalid(`cycle in the committed chain at ${current.body_digest}`);
    }
    seen.add(current.body_digest);

    const predecessorDigest = current.predecessor;
    if (predecessorDigest === null || predecessorDigest === undefined) {
      return notAncestor(`the walk reached a committed root at ${current.body_digest}`);
    }
    if (typeof predecessorDigest !== "string") {
      return invalid(`record ${current.body_digest} carries a non-string predecessor`);
    }
    if (seen.has(predecessorDigest)) {
      return invalid(`cycle in the committed chain at ${predecessorDigest}`);
    }

    const next = index.get(predecessorDigest);
    if (!next) {
      // The link exists but its target was never committed. Short material, not a contradiction —
      // unless the missing target IS the earlier view, in which case the chain names it and simply
      // did not commit its record; that is still short material.
      return unprovable(`no committed record for ${predecessorDigest}`);
    }

    if (!(next.epoch < current.epoch)) {
      return invalid(
        `link ${current.body_digest} → ${predecessorDigest} does not decrease epoch ` +
          `(${current.epoch} → ${next.epoch})`
      );
    }
    if (next.epoch !== current.epoch - 1 && policy.allow_epoch_gaps !== true) {
      return unprovable(
        `epoch gap ${next.epoch} → ${current.epoch} and policy does not commit allow_epoch_gaps`
      );
    }

    for (const [kind, from, to] of [
      ["policy", next.policy_digest, current.policy_digest],
      ["protocol", next.protocol_version, current.protocol_version],
    ]) {
      switch (transitionState(kind, from, to, transitions)) {
        case "uncommitted":
          return unprovable(`${kind} change ${from} → ${to} has no committed transition record`);
        case "contradicted":
          return invalid(
            `the committed ${kind} transition records do not cover ${from} → ${to} — false derivation`
          );
        default:
          break;
      }
    }

    if (predecessorDigest === target) return proven();
    current = next;
  }
}

/**
 * Bind a committed chain into the oracle shape `compare` expects. `core/compatibility.mjs` never
 * imports this module — the dependency runs one way, from the caller.
 *
 * @param {{chain?: Array<object>, policy?: object}} committed
 * @returns {(earlier: object, later: object) => {verdict: string, detail?: string}}
 */
export function ancestryOracle(committed = {}) {
  return (earlier, later) => proveAncestry(earlier, later, committed);
}
