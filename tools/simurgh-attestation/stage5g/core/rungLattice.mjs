// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC rung lattice. Consumes already-verified predicate booleans; re-checks nothing. Called
// only after 287 + 289 passed, so rung-0 is always satisfied.
export function rungLattice({ challengeBound, anchorValid, subjectDistinct }) {
  if (challengeBound && anchorValid && subjectDistinct) return "externally_anchored";
  if (challengeBound) return "challenge_bound";
  return "distinct_key_only";
}
