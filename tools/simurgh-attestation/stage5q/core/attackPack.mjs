// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — attack-pack schema (spec §4.3), the premise gate (§4.4) and symbolic-outcome
// enforcement (§12.4).
//
// A pack is `(stage_or_campaign, attack_class)` and is a first-class artifact. Three rules make it
// admissible, and all three are refusals rather than warnings:
//
//   NO PREMISE RECEIPT, NO ADMISSION. A pack without one is vacuous REGARDLESS OF ITS RESULTS. This
//   ordering matters: checking results first and premises second is how a green run buys itself the
//   benefit of the doubt.
//
//   NO RAW CODES (§12.4). Expected outcomes are SYMBOLIC. A numeric code in a pack pins the pack to
//   a number that Q1 may reallocate, and a pack that silently starts expecting a different failure
//   is a pack that stops testing what it was written for.
//
//   NO FREE-TEXT OMISSIONS. An omitted attack class carries a reason from the frozen six-value
//   enum, because free text is where "not applicable here" goes to hide.

import { ATTACK_CLASSES, OMISSION_REASONS, PREDICATE_REGISTRY } from "./constants.mjs";

/** The §4.3 record. Every field is REQUIRED — an optional field in a schema gate is a suggestion. */
export const PACK_FIELDS = Object.freeze([
  "attack_pack_id",
  "target_scope",
  "attack_class",
  "premise_receipt",
  "fixture_digests",
  "expected_outcomes",
  "observed_outcomes",
]);

/** Symbolic outcome grammar: lower_snake identifiers. Never a number, never a numeric string. */
const SYMBOLIC = /^[a-z][a-z0-9_]*$/;

/** `5q-<scope>-<class>-<nn>`; citable in a finding forever. */
const PACK_ID = /^5q-[a-z0-9]+(-[a-z0-9]+)*-r(1[0-6]|[1-9])-\d{2,}$/;

export const PACK_PROBLEM_KINDS = Object.freeze([
  "missing_field",
  "unknown_field",
  "malformed_pack_id",
  "unknown_attack_class",
  "missing_premise_receipt",
  "unknown_predicate",
  "empty_fixture_digests",
  "malformed_fixture_digest",
  "raw_code_in_outcomes",
  "non_symbolic_outcome",
  "invalid_omission_reason",
  "omission_with_results",
]);

/**
 * Validate one attack pack.
 *
 * @param {object} pack
 * @returns {{ok: boolean, problems: object[]}}
 */
export function validateAttackPack(pack) {
  const problems = [];
  const add = (kind, detail) => problems.push({ kind, ...detail });

  if (!pack || typeof pack !== "object") {
    return { ok: false, problems: [{ kind: "missing_field", field: "<pack>" }] };
  }

  // An OMITTED pack declares that a class does not apply and carries a frozen reason. It is the one
  // shape permitted to lack a premise receipt — because it ran nothing, and it must therefore also
  // report nothing.
  if (pack.omitted === true) {
    if (!OMISSION_REASONS.includes(pack.omission_reason)) {
      add("invalid_omission_reason", {
        omission_reason: pack.omission_reason ?? null,
        reason:
          "an omitted class carries a reason from the §4.2 frozen six. Free text is where " +
          "'not applicable here' goes to hide, and a reason a reviewer cannot check is not a reason.",
      });
    }
    if ((pack.observed_outcomes ?? []).length > 0) {
      add("omission_with_results", {
        reason: "a pack that omitted the class cannot also report what it observed",
      });
    }
    if (!ATTACK_CLASSES.includes(pack.attack_class)) {
      add("unknown_attack_class", { attack_class: pack.attack_class ?? null });
    }
    return { ok: problems.length === 0, problems };
  }

  for (const field of PACK_FIELDS) {
    if (pack[field] === undefined || pack[field] === null) add("missing_field", { field });
  }
  for (const key of Object.keys(pack)) {
    if (!PACK_FIELDS.includes(key) && !["omitted", "omission_reason"].includes(key)) {
      add("unknown_field", {
        field: key,
        reason: "the §4.3 record is exact; an extra field is an unreviewed channel into the pack",
      });
    }
  }

  if (typeof pack.attack_pack_id === "string" && !PACK_ID.test(pack.attack_pack_id)) {
    add("malformed_pack_id", {
      attack_pack_id: pack.attack_pack_id,
      reason:
        "pack ids are cited in findings forever, so their shape is fixed: 5q-<scope>-r<n>-<nn>",
    });
  }
  if (!ATTACK_CLASSES.includes(pack.attack_class)) {
    add("unknown_attack_class", { attack_class: pack.attack_class ?? null });
  }

  // THE PREMISE GATE. Checked before anything is read from the results, so a green run never buys
  // itself the benefit of the doubt.
  const receipt = pack.premise_receipt;
  if (!receipt || typeof receipt !== "object") {
    add("missing_premise_receipt", {
      reason:
        "a pack that cannot produce its premise receipt is vacuous and its passes are " +
        "INADMISSIBLE, regardless of what it observed (spec §4.4)",
    });
  } else if (!PREDICATE_REGISTRY.includes(receipt.predicate_id)) {
    add("unknown_predicate", { predicate_id: receipt.predicate_id ?? null });
  }

  const digests = pack.fixture_digests;
  if (Array.isArray(digests)) {
    if (digests.length === 0) {
      add("empty_fixture_digests", {
        reason: "a pack with no fixtures attacked nothing; an empty list is not a small list",
      });
    }
    for (const d of digests) {
      if (!/^[0-9a-f]{64}$/.test(d)) add("malformed_fixture_digest", { fixture_digest: d });
    }
  }

  for (const [field, values] of [
    ["expected_outcomes", pack.expected_outcomes],
    ["observed_outcomes", pack.observed_outcomes],
  ]) {
    if (!Array.isArray(values)) continue;
    for (const v of values) {
      if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))) {
        add("raw_code_in_outcomes", {
          field,
          value: v,
          reason:
            "outcomes are SYMBOLIC, never raw codes (spec §12.4). A number here pins the pack to a " +
            "code Q1 may reallocate, after which the pack quietly starts expecting a different failure.",
        });
      } else if (typeof v !== "string" || !SYMBOLIC.test(v)) {
        add("non_symbolic_outcome", { field, value: v });
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Admissibility, stated in the order the spec states it.
 *
 * `verifyPremise` is injected rather than imported-and-called so the caller controls fixture I/O;
 * the ordering below is the part that must not move.
 */
export function isAdmissible(pack, premiseResult) {
  const schema = validateAttackPack(pack);
  if (pack?.omitted === true) {
    return {
      admissible: schema.ok,
      reason: schema.ok ? "omitted with a frozen reason" : "schema",
      schema,
    };
  }
  if (!schema.ok) return { admissible: false, reason: "schema", schema };
  if (!premiseResult?.ok) {
    return {
      admissible: false,
      reason: "premise",
      schema,
      detail:
        "the premise did not recompute over the frozen fixture bytes. Its passes are inadmissible " +
        "even if every observed outcome matched.",
    };
  }
  return { admissible: true, reason: "admitted", schema };
}
