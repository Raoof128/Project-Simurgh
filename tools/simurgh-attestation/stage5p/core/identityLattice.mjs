// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §1 — the componentwise Identity Resolution Lattice.
//
// Four INDEPENDENT axes under the product order. The order is PARTIAL by construction: a long-lived
// pseudonymous organisational key and a ten-minute OIDC identity are genuinely incomparable, and any
// total order over them has to launder one into the other. Stage 5G's rungLattice collapses three
// predicates into one three-valued rung — sound there, wrong for identity. This module refuses.
//
// LAW 1 (No Imaginary Ordering): no average, score, weighted sum or "overall level" is ever
// computed, and none is ever exported. The per-axis position below is a private implementation
// detail of the comparison; it is not a strength number and must never escape this module.
//
// Pure: no crypto, no I/O, no clock (5M's B11 — facts are injected, the core only decides).

export const AXES = Object.freeze(["binding", "resolution", "continuity", "role"]);

// Each axis lists its values from floor to top. Position encodes ORDER WITHIN ONE AXIS ONLY;
// positions are never compared across axes and never summed.
export const AXIS_VALUES = Object.freeze({
  binding: Object.freeze(["unbound", "cryptographically_bound"]),
  resolution: Object.freeze(["unresolved", "provider_asserted", "principal_resolved"]),
  continuity: Object.freeze(["ephemeral", "durable"]),
  role: Object.freeze(["unproven", "accountable_role_bound"]),
});

export const RELATIONS = Object.freeze([
  "equal",
  "strictly_below",
  "strictly_above",
  "incomparable",
]);

// Private, per-axis. Deliberately not exported: an escaped index is a scalar wearing a disguise.
const positionOf = (axis, value) => AXIS_VALUES[axis].indexOf(value);

export function makeStrength(vector) {
  if (vector === null || typeof vector !== "object") {
    throw new TypeError("identity strength: expected an object of exactly the four frozen axes");
  }
  for (const key of Object.keys(vector)) {
    if (!AXES.includes(key)) throw new TypeError(`identity strength: unknown axis "${key}"`);
  }
  const out = {};
  for (const axis of AXES) {
    if (!(axis in vector)) throw new TypeError(`identity strength: missing axis "${axis}"`);
    const value = vector[axis];
    if (positionOf(axis, value) < 0) {
      throw new TypeError(`identity strength: unknown value "${value}" on axis "${axis}"`);
    }
    out[axis] = value;
  }
  return Object.freeze(out);
}

// `a ≤ᵥ b` — the componentwise order. Every axis must be at or below b's; one axis above is enough
// to make it false, which is exactly what keeps the order partial.
export function leqV(a, b) {
  return AXES.every((axis) => positionOf(axis, a[axis]) <= positionOf(axis, b[axis]));
}

// The comparator emits a RELATION, never a verdict. Policy decides acceptance elsewhere
// (`accept ⇔ required ≤ᵥ actual`); an incomparable pair is an ordinary partial-order fact here.
//
// Exhaustive and mutually exclusive by construction — the four branches below partition the space,
// which is the operational form of the `relationPartition` and `incomparableIff` Lean targets.
export function compareStrength(a, b) {
  const below = leqV(a, b);
  const above = leqV(b, a);
  if (below && above) return "equal";
  if (below) return "strictly_below";
  if (above) return "strictly_above";
  return "incomparable";
}

// Componentwise join (`⊔`). Used by Law 4's delta bound: a resolver may raise an axis only as far as
// `strength(e) ⊔ ceiling(r)` permits, so it can neither manufacture strength beyond its standing nor
// lower strength that other evidence already established.
export function joinV(a, b) {
  const out = {};
  for (const axis of AXES) {
    out[axis] = positionOf(axis, a[axis]) >= positionOf(axis, b[axis]) ? a[axis] : b[axis];
  }
  return Object.freeze(out);
}
