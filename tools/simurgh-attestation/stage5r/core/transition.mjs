// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 6: prior-stage non-disturbance, and the attribution model.
//
// This is 5R's OWN copy of the model 5Q built. It is a copy and not a rename, and the distinction is
// mechanical rather than stylistic: `regressed_by_q0` is defined in stage5q/core/transition.mjs and
// asserted by name in a 5Q unit test and the 5Q K7 net. Renaming it in place would edit three files
// frozen §2.3 makes read-only, break the predecessor's own tests, and move bytes G8 requires to be
// identical — a rename dressed as inheritance. A small copied module is the whole cost of leaving
// 5Q's record exactly as signed.
//
// Every value except the regression label is byte-identical to 5Q's, and the two that carry the
// weight are the ones 5Q had to learn:
//
//   not_compared    absent a baseline run, "we did not check" must not be dressed up as "green"
//   not_comparable  a tree-relative command names different commits in different worktrees, so the
//                   two runs answer different questions; calling that "pre_existing" would be a false
//                   attribution of exactly the kind this function exists to prevent

/** The five attribution values. Only the regression label differs from 5Q's. */
export const ATTRIBUTIONS = Object.freeze([
  "green",
  "regressed_by_5r",
  "pre_existing",
  "not_compared",
  "not_comparable",
]);

/**
 * Attribute each command's outcome against a baseline run.
 *
 * @param {{results: Array<{command: string, ok: boolean, tree_relative?: boolean}>,
 *          baselineResults: Array<{command: string, ok: boolean}>|null}} input
 * @returns {{results: Array<object>} & Record<string, string[]>}
 */
export function attribute({ results, baselineResults }) {
  if (!Array.isArray(results)) throw new TypeError("transition: results must be an array");
  const baseline =
    baselineResults === null || baselineResults === undefined
      ? null
      : new Map(baselineResults.map((r) => [r.command, r.ok]));

  const attributed = results.map((r) => {
    if (r.ok) return { ...r, attribution: "green" };
    if (r.tree_relative) return { ...r, attribution: "not_comparable" };
    if (baseline === null) return { ...r, attribution: "not_compared" };
    if (!baseline.has(r.command)) return { ...r, attribution: "not_compared" };
    return { ...r, attribution: baseline.get(r.command) ? "regressed_by_5r" : "pre_existing" };
  });

  const of = (kind) => attributed.filter((r) => r.attribution === kind).map((r) => r.command);
  return {
    results: attributed,
    green: of("green"),
    regressed_by_5r: of("regressed_by_5r"),
    pre_existing: of("pre_existing"),
    not_compared: of("not_compared"),
    not_comparable: of("not_comparable"),
  };
}

/**
 * Did 5R disturb a prior stage? Only a regression counts. `not_compared` is not a pass.
 *
 * @param {ReturnType<typeof attribute>} a
 * @returns {{disturbed: boolean, unverified: number}}
 */
export function disturbance(a) {
  return {
    disturbed: a.regressed_by_5r.length > 0,
    unverified: a.not_compared.length + a.not_comparable.length,
  };
}
