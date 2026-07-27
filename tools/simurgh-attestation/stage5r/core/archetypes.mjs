// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Tasks 4 and 5: the role archetypes, the family universe, and the tranche.
//
// Frozen §5.1 names seven archetypes and §5.2 adds A8 (`formal_statement`) deliberately, because
// without it 362 inherited cells would be permanently undischargeable and 5R would be publishing a
// coverage figure over a denominator quietly smaller than the one it inherited.
//
// §5.4 freezes the RULE that determines the universe, not the membership: the pairs (attack_class,
// target_security_role) that generate at least one obligated cell in the inherited matrix, restricted
// to the eleven under-supported classes. The census emits the membership. Immutable rule in the spec,
// mutable state in a generated ledger.
//
// RULING 2, recorded as data rather than as a comment: `orchestration` is obligated only under R9 and
// R16, both in the attacked five, so no pair in the universe touches it. A7's floor is therefore met
// through `parity_mirror` alone, and the closeout must say `orchestration` was never in scope rather
// than letting A7's tick imply it was.

import { UNDER_SUPPORTED } from "./measurements.mjs";

/** §5.1's seven archetypes, plus §5.2's named extension. Role → archetype. */
export const ARCHETYPE_OF = Object.freeze({
  trust_decision: "A1",
  completeness_claim: "A2",
  canonicalisation: "A3",
  code_allocation: "A4",
  evidence_emission: "A5",
  schema_gate: "A6",
  orchestration: "A7",
  parity_mirror: "A7",
  formal_statement: "A8",
});

/** Roles that map to no archetype: they carry an empty required-class matrix and obligate nothing. */
export const UNMAPPED_ROLES = Object.freeze(["pure_transform", "imported_dependency"]);

/** A8 is an addition to the ruling's list, flagged as such wherever it appears. */
export const A8_IS_AN_EXTENSION = true;

const byClassNumber = (a, b) => Number(a.slice(1)) - Number(b.slice(1));

/**
 * Apply §5.4's rule to the inherited matrix.
 *
 * @param {{closure: object, matrix: object}} evidence parsed JSON
 * @returns {{pairs: Array<object>, roles: string[], unreachable_roles: Array<object>}}
 */
export function buildUniverse({ closure, matrix }) {
  const members = Array.isArray(closure) ? closure : (closure.members ?? []);
  const roleOf = new Map(members.map((m) => [m.function_id, m.security_role]));

  const cellsBy = new Map();
  const classesByRole = new Map();
  for (const cell of matrix.cells) {
    if (cell.applicability !== "obligated") continue;
    const role = roleOf.get(cell.function_id);
    if (!role) continue;
    const key = `${cell.attack_class}|${role}`;
    cellsBy.set(key, (cellsBy.get(key) ?? 0) + 1);
    if (!classesByRole.has(role)) classesByRole.set(role, new Set());
    classesByRole.get(role).add(cell.attack_class);
  }

  const pairs = [];
  for (const [key, cells] of cellsBy) {
    const [attack_class, target_security_role] = key.split("|");
    if (!UNDER_SUPPORTED.includes(attack_class)) continue;
    pairs.push({
      attack_class,
      target_security_role,
      role_archetype: ARCHETYPE_OF[target_security_role] ?? null,
      inherited_5q_obligation_cells: cells,
    });
  }
  pairs.sort(
    (a, b) =>
      byClassNumber(a.attack_class, b.attack_class) ||
      a.target_security_role.localeCompare(b.target_security_role)
  );

  const reachable = new Set(pairs.map((p) => p.target_security_role));

  // Roles that carry an archetype but appear in NO universe pair. Recorded with the reason, because
  // an archetype ticked through a role the universe cannot reach is coverage that never existed.
  const unreachable = [];
  for (const [role, archetype] of Object.entries(ARCHETYPE_OF)) {
    if (reachable.has(role)) continue;
    const classes = [...(classesByRole.get(role) ?? [])].sort(byClassNumber);
    unreachable.push({
      role,
      role_archetype: archetype,
      obligated_under: classes,
      reason:
        classes.length === 0
          ? "obligated under no class in the inherited matrix"
          : `obligated only under ${classes.join(", ")}, none of which is under-supported`,
    });
  }
  unreachable.sort((a, b) => a.role.localeCompare(b.role));

  return { pairs, roles: [...reachable].sort(), unreachable_roles: unreachable };
}

/**
 * The archetypes an under-supported class actually obligates — §11.5's floor is measured over these,
 * not over the ruling's list, because an archetype the universe cannot reach cannot be discharged.
 *
 * @param {Array<object>} pairs
 * @returns {string[]} sorted archetype ids
 */
export function reachableArchetypes(pairs) {
  return [...new Set(pairs.map((p) => p.role_archetype))].filter(Boolean).sort();
}

/**
 * §4's precommitted first tranche: one pair per reachable archetype, chosen by a stated rule rather
 * than by taste.
 *
 * The rule: attack where the predecessor's evidence is thinnest first. The three reachable roles no
 * mutant ever touched lead; then one pair per remaining archetype, taking the class carrying the
 * largest obligation in that role.
 */
export const TRANCHE_T1 = Object.freeze([
  Object.freeze({ family: "F1", attack_class: "R2", target_security_role: "evidence_emission" }),
  Object.freeze({ family: "F2", attack_class: "R10", target_security_role: "formal_statement" }),
  Object.freeze({ family: "F3", attack_class: "R12", target_security_role: "code_allocation" }),
  Object.freeze({ family: "F4", attack_class: "R4", target_security_role: "trust_decision" }),
  Object.freeze({ family: "F5", attack_class: "R3", target_security_role: "completeness_claim" }),
  Object.freeze({ family: "F6", attack_class: "R3", target_security_role: "schema_gate" }),
  Object.freeze({ family: "F7", attack_class: "R6", target_security_role: "canonicalisation" }),
  Object.freeze({ family: "F8", attack_class: "R11", target_security_role: "parity_mirror" }),
]);

/** The roles that received no mutation evidence at all and are reachable in this universe. */
export const THINNEST_FIRST = Object.freeze([
  "evidence_emission",
  "formal_statement",
  "code_allocation",
]);

/**
 * Build the tranche record, binding each family to its pair in the universe.
 *
 * @param {Array<object>} pairs output of buildUniverse().pairs
 * @returns {{families: Array<object>, spanned_cells: number, archetypes: string[]}}
 */
export function buildTranche(pairs) {
  const index = new Map(pairs.map((p) => [`${p.attack_class}|${p.target_security_role}`, p]));
  const families = TRANCHE_T1.map((t) => {
    const pair = index.get(`${t.attack_class}|${t.target_security_role}`);
    if (!pair) {
      throw new Error(
        `tranche: ${t.family} names ${t.attack_class} × ${t.target_security_role}, which is not in the universe`
      );
    }
    return {
      ...t,
      role_archetype: pair.role_archetype,
      inherited_5q_obligation_cells: pair.inherited_5q_obligation_cells,
      selection_basis: THINNEST_FIRST.includes(t.target_security_role)
        ? "no mutation evidence ever reached this role"
        : "largest obligation in this role among the under-supported classes",
    };
  });
  return {
    families,
    spanned_cells: families.reduce((a, f) => a + f.inherited_5q_obligation_cells, 0),
    archetypes: [...new Set(families.map((f) => f.role_archetype))].sort(),
  };
}
