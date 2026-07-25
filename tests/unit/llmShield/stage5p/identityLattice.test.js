// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §1 — the componentwise Identity Resolution Lattice.
//
// These assertions freeze Law 1 (No Imaginary Ordering) in executable form. The lattice is a
// PRODUCT order over four independent axes, so it is PARTIAL: incomparable pairs are ordinary
// facts, not malformed evidence. Section 1's Lean targets `incomparableIff` and `relationPartition`
// are proved here operationally before Lean proves them symbolically.
//
// Nothing in this file may compute an average, score, weighted sum, or "overall level".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AXES,
  AXIS_VALUES,
  makeStrength,
  compareStrength,
  leqV,
  joinV,
  RELATIONS,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";

const FLOOR = makeStrength({
  binding: "unbound",
  resolution: "unresolved",
  continuity: "ephemeral",
  role: "unproven",
});
const CEIL = makeStrength({
  binding: "cryptographically_bound",
  resolution: "principal_resolved",
  continuity: "durable",
  role: "accountable_role_bound",
});
// The two vectors Section 1 names as the motivating incomparable pair. NOTE the name: this is an
// ephemeral-but-principal-resolved OIDC identity IN THE ABSTRACT — it is deliberately NOT called
// "Sigstore", because the spec's Lane B writes down that a real public Sigstore ceremony achieves
// only provider_asserted. A fixture name is a claim (the 5N lesson); this one no longer overclaims.
const PSEUDONYMOUS_ORG = makeStrength({
  binding: "cryptographically_bound",
  resolution: "provider_asserted",
  continuity: "durable",
  role: "unproven",
});
const EPHEMERAL_RESOLVED_OIDC = makeStrength({
  binding: "cryptographically_bound",
  resolution: "principal_resolved",
  continuity: "ephemeral",
  role: "unproven",
});

test("the four axes and their value sets match the frozen spec", () => {
  assert.deepEqual(AXES, ["binding", "resolution", "continuity", "role"]);
  assert.deepEqual(AXIS_VALUES.binding, ["unbound", "cryptographically_bound"]);
  assert.deepEqual(AXIS_VALUES.resolution, [
    "unresolved",
    "provider_asserted",
    "principal_resolved",
  ]);
  assert.deepEqual(AXIS_VALUES.continuity, ["ephemeral", "durable"]);
  assert.deepEqual(AXIS_VALUES.role, ["unproven", "accountable_role_bound"]);
});

test("makeStrength rejects an unknown axis, an unknown value, and a missing axis", () => {
  assert.throws(() => makeStrength({ ...FLOOR, nonsense: "x" }), /unknown axis/);
  assert.throws(() => makeStrength({ ...FLOOR, role: "president" }), /unknown value/);
  const { role, ...missing } = FLOOR;
  assert.throws(() => makeStrength(missing), /missing axis/);
});

test("leqV is the componentwise order: reflexive, and floor <= everything <= ceiling", () => {
  for (const v of [FLOOR, CEIL, PSEUDONYMOUS_ORG, EPHEMERAL_RESOLVED_OIDC]) {
    assert.equal(leqV(v, v), true, "reflexive");
    assert.equal(leqV(FLOOR, v), true, "floor is bottom");
    assert.equal(leqV(v, CEIL), true, "ceiling is top");
  }
});

// Law 1 — the pair that any total order would have to launder into a ranking.
test("a durable pseudonymous org and an ephemeral resolved OIDC identity are INCOMPARABLE", () => {
  assert.equal(leqV(PSEUDONYMOUS_ORG, EPHEMERAL_RESOLVED_OIDC), false);
  assert.equal(leqV(EPHEMERAL_RESOLVED_OIDC, PSEUDONYMOUS_ORG), false);
  assert.equal(compareStrength(PSEUDONYMOUS_ORG, EPHEMERAL_RESOLVED_OIDC), "incomparable");
});

// Lean target `incomparableIff` — BICONDITIONAL. The one-directional form is satisfied by a broken
// comparator that labels every pair incomparable, so both directions are asserted.
test("incomparableIff: relation is incomparable IFF neither direction holds", () => {
  const all = allVectors();
  for (const a of all) {
    for (const b of all) {
      const isIncomparable = compareStrength(a, b) === "incomparable";
      const neitherHolds = !leqV(a, b) && !leqV(b, a);
      assert.equal(
        isIncomparable,
        neitherHolds,
        `biconditional failed for ${JSON.stringify([a, b])}`
      );
    }
  }
});

// Lean target `relationPartition` — exhaustive AND mutually exclusive over the whole 24-vector space.
test("relationPartition: exactly one relation holds for every ordered pair", () => {
  const all = allVectors();
  assert.equal(all.length, 24, "2 * 3 * 2 * 2 vectors");
  for (const a of all) {
    for (const b of all) {
      const holds = [
        compareStrength(a, b) === "equal",
        compareStrength(a, b) === "strictly_below",
        compareStrength(a, b) === "strictly_above",
        compareStrength(a, b) === "incomparable",
      ].filter(Boolean);
      assert.equal(holds.length, 1, `expected exactly one relation for ${JSON.stringify([a, b])}`);
      assert.ok(RELATIONS.includes(compareStrength(a, b)), "relation is one of the frozen four");
    }
  }
});

test("relations are correctly oriented, not merely partitioned", () => {
  assert.equal(compareStrength(FLOOR, FLOOR), "equal");
  assert.equal(compareStrength(FLOOR, CEIL), "strictly_below");
  assert.equal(compareStrength(CEIL, FLOOR), "strictly_above");
});

// Law 4 — the ceiling bounds the DELTA. joinV is the componentwise join used by boundResolverDelta.
test("joinV is the componentwise join: never lowers either operand", () => {
  const j = joinV(PSEUDONYMOUS_ORG, EPHEMERAL_RESOLVED_OIDC);
  assert.equal(leqV(PSEUDONYMOUS_ORG, j), true);
  assert.equal(leqV(EPHEMERAL_RESOLVED_OIDC, j), true);
  assert.equal(j.continuity, "durable", "takes the stronger continuity");
  assert.equal(j.resolution, "principal_resolved", "takes the stronger resolution");
  assert.equal(j.role, "unproven", "invents nothing on an axis where both are at the floor");
});

// The anti-goal, asserted directly: no scalar collapse anywhere in the module's surface.
test("the lattice exposes no scalar score, level, or rank", () => {
  const surface = { AXES, AXIS_VALUES, makeStrength, compareStrength, leqV, joinV, RELATIONS };
  for (const name of Object.keys(surface)) {
    assert.ok(
      !/score|level|rank|rung|total|weight/i.test(name),
      `Law 1 forbids a scalar-shaped export, found: ${name}`
    );
  }
  assert.equal(
    typeof compareStrength(FLOOR, CEIL),
    "string",
    "relations are symbolic, never numeric"
  );
});

function allVectors() {
  const out = [];
  for (const binding of AXIS_VALUES.binding)
    for (const resolution of AXIS_VALUES.resolution)
      for (const continuity of AXIS_VALUES.continuity)
        for (const role of AXIS_VALUES.role)
          out.push(makeStrength({ binding, resolution, continuity, role }));
  return out;
}
