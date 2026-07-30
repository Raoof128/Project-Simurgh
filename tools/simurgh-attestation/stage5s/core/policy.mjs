// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the two policy blocks of spec §3.3, kept apart on purpose.
//
// THEY AUTHORISE DIFFERENT PROPOSITIONS. A witness statement attests "I verified and signed this
// producer-authenticated checkpoint tuple under the committed witness policy." An anchor attests
// something far narrower: that a digest existed. Merging the two blocks would let the narrower
// evidence satisfy a threshold defined over the wider one.
//
// THE ASYMMETRY IS DELIBERATE, AND IT IS THE RULING. The quorum lane is CI-gated, so its refusals
// allocate raw codes (484..487) and stop a run. Lane C is never CI-gated, so a malformed or unmet
// corroboration policy allocates NO raw code — it surfaces as a status in the attestation. A test
// asserts both directions against the allocator, so the asymmetry cannot drift into prose-only.
//
// VALIDITY ONLY (Ruling 3). Neither function returns, names, or implies a status. Computing
// `external_corroboration_status` here would couple a status to a validator and quietly turn a Lane
// C shortfall into a verifier refusal. The five statuses are five functions in Task 13.

import { EXTERNAL_ANCHOR_CLASS, WITNESS_OPERATOR_CLASS, classOf } from "./classes.mjs";

/** Refusals of the CI-gated lane. Each maps to a raw code in the witness-policy band. */
export const QUORUM_POLICY_REFUSALS = Object.freeze({
  NOT_COMMITTED: "POLICY_NOT_COMMITTED",
  MALFORMED_OR_ROSTER_INVALID: "POLICY_MALFORMED_OR_ROSTER_INVALID",
});

/** Refusals of Lane C. None of these appears in the raw-code band, and none ever may. */
export const CORROBORATION_POLICY_REFUSALS = Object.freeze({
  NOT_COMMITTED: "CORROBORATION_POLICY_NOT_COMMITTED",
  MALFORMED: "CORROBORATION_POLICY_MALFORMED",
  ECOLOGY_CLASS_UNKNOWN: "CORROBORATION_ECOLOGY_CLASS_UNKNOWN",
  CLASS_TAXONOMY_CROSSED: "CORROBORATION_CLASS_TAXONOMY_CROSSED",
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;

/**
 * Validate a `witness_quorum_policy` block. Pure; never throws.
 *
 * Checks only what the block decides about itself. `POLICY_DIGEST_MISMATCH` (486) and
 * `PRODUCER_KEY_NOT_COMMITTED` (487) are decided against a checkpoint, not against the block, and
 * belong to the ordered evaluator.
 *
 * @param {unknown} policy
 * @returns {{ok: boolean, refusals: Array<{reason: string, field?: string, detail?: string}>}}
 */
export function validateWitnessQuorumPolicy(policy) {
  const R = QUORUM_POLICY_REFUSALS;
  if (!isPlainObject(policy)) {
    return { ok: false, refusals: [{ reason: R.NOT_COMMITTED }] };
  }

  const refusals = [];
  const bad = (field, detail) =>
    refusals.push({ reason: R.MALFORMED_OR_ROSTER_INVALID, field, detail });

  const roster = policy.witness_roster;
  if (!Array.isArray(roster) || roster.length === 0) {
    bad("witness_roster", "absent or empty");
  } else {
    const identities = new Set();
    const keyDigests = new Set();
    for (const [i, entry] of roster.entries()) {
      if (!isPlainObject(entry)) {
        bad("witness_roster", `entry ${i} is not an object`);
        continue;
      }
      if (!isNonEmptyString(entry.witness_identity)) bad("witness_roster", `entry ${i}: identity`);
      else if (identities.has(entry.witness_identity))
        bad("witness_roster", `duplicate identity ${entry.witness_identity}`);
      else identities.add(entry.witness_identity);

      // A shared key digest is two roster seats behind one key: the alias check at 492 catches it at
      // tally time, but a roster that ships it is already invalid.
      if (!isNonEmptyString(entry.key_digest)) bad("witness_roster", `entry ${i}: key_digest`);
      else if (keyDigests.has(entry.key_digest))
        bad("witness_roster", `key digest shared by two roster seats: ${entry.key_digest}`);
      else keyDigests.add(entry.key_digest);

      const cls = classOf(entry.witness_operator_class);
      if (cls === "external_anchor") {
        bad(
          "witness_roster",
          `taxonomy crossed: ${entry.witness_operator_class} is an external_anchor_class`
        );
      } else if (cls === null) {
        bad("witness_roster", `entry ${i}: unknown witness_operator_class`);
      }
    }
  }

  const q = policy.threshold_q;
  if (!isPositiveInt(q)) {
    bad("threshold_q", "not a positive integer");
  } else if (Array.isArray(roster) && q > roster.length) {
    bad("threshold_q", `threshold ${q} exceeds roster of ${roster.length} — unsatisfiable`);
  }

  const mix = policy.required_class_mix;
  if (!isPlainObject(mix)) {
    bad("required_class_mix", "absent or not an object");
  } else {
    let required = 0;
    for (const [cls, count] of Object.entries(mix)) {
      const kind = classOf(cls);
      if (kind === "external_anchor") {
        // §3.1, machine-checked: an anchor may never count toward `threshold_q`.
        bad("required_class_mix", `taxonomy crossed: ${cls} is an external_anchor_class`);
        continue;
      }
      if (kind === null) {
        bad("required_class_mix", `unknown class ${cls}`);
        continue;
      }
      if (!Number.isInteger(count) || count < 0) {
        bad("required_class_mix", `${cls}: count is not a non-negative integer`);
        continue;
      }
      required += count;
    }
    if (isPositiveInt(q) && required > q) {
      bad("required_class_mix", `mix requires ${required} witnesses but threshold_q is ${q}`);
    }
  }

  return { ok: refusals.length === 0, refusals };
}

/**
 * Validate an `external_corroboration_policy` block. Pure; never throws.
 *
 * Checks the block's SHAPE only. Whether the submitted anchors actually meet
 * `minimum_distinct_mechanisms` is a satisfaction question, and satisfaction is a status.
 *
 * @param {unknown} policy
 * @returns {{ok: boolean, refusals: Array<{reason: string, field?: string, detail?: string}>}}
 */
export function validateExternalCorroborationPolicy(policy) {
  const R = CORROBORATION_POLICY_REFUSALS;
  if (!isPlainObject(policy)) {
    return { ok: false, refusals: [{ reason: R.NOT_COMMITTED }] };
  }

  const refusals = [];
  const bad = (field, detail) => refusals.push({ reason: R.MALFORMED, field, detail });

  const permitted = policy.permitted_ecology_classes;
  if (!Array.isArray(permitted) || permitted.length === 0) {
    bad("permitted_ecology_classes", "absent or empty");
  } else {
    for (const cls of permitted) {
      const kind = classOf(cls);
      if (kind === "witness_operator") {
        refusals.push({
          reason: R.CLASS_TAXONOMY_CROSSED,
          field: "permitted_ecology_classes",
          detail: `${cls} is a witness_operator_class and carries witness weight`,
        });
      } else if (kind === null) {
        refusals.push({
          reason: R.ECOLOGY_CLASS_UNKNOWN,
          field: "permitted_ecology_classes",
          detail: `${cls} is in neither taxonomy; known anchors: ${EXTERNAL_ANCHOR_CLASS.join(", ")}`,
        });
      }
    }
  }

  const minimum = policy.minimum_distinct_mechanisms;
  if (!isPositiveInt(minimum)) {
    bad("minimum_distinct_mechanisms", "not a positive integer");
  } else if (Array.isArray(permitted) && minimum > permitted.length) {
    bad(
      "minimum_distinct_mechanisms",
      `${minimum} distinct mechanisms required from ${permitted.length} permitted — unsatisfiable`
    );
  }

  if (!isNonEmptyString(policy.required_envelope_digest)) {
    bad("required_envelope_digest", "absent or not a string");
  }

  // Lane C's interior is its own business and is never CI-gated; the block must simply carry it.
  if (!isPlainObject(policy.freshness_and_inclusion_requirements)) {
    bad("freshness_and_inclusion_requirements", "absent or not an object");
  }

  return { ok: refusals.length === 0, refusals };
}

/** Exported so a reader can see the witness taxonomy the mix is checked against. */
export const __policyInternals = Object.freeze({ WITNESS_OPERATOR_CLASS });
