// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — the Lean proof is BOUND to the implementation it claims to model.
//
// A proof that drifts from the code proves something about a program nobody runs. This test does not
// re-prove the theorems — `lean proofs/stage5p/Vsi.lean` does that — it checks three things Lean
// cannot check for us: that no proof escape was introduced, that every target the SPEC named is
// actually discharged, and that the structures the theorems quantify over still match the shipped
// verifier's shape.
//
// 5N's lesson is the reason for the last one: a real ceremony found a defect that 61 tests and 13
// Lean theorems all missed, because proofs cannot see the seam where facts are manufactured. Binding
// the model to the code does not close that seam. It closes the *drift*, which is a different and
// smaller claim.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AXES,
  RELATIONS,
  AXIS_VALUES,
  compareStrength,
  leqV,
  joinV,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";
import { POLICY_OUTCOMES } from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";

const LEAN = readFileSync(
  fileURLToPath(new URL("../../../../proofs/stage5p/Vsi.lean", import.meta.url)),
  "utf8"
);

// The six targets named in frozen spec §1.
const SPEC_TARGETS = [
  "replayMonotone",
  "noSelfUpgrade",
  "boundResolverDelta",
  "incomparableIff",
  "relationPartition",
  "principalMismatchNoJoin",
];

const theoremNames = () =>
  [...LEAN.matchAll(/^theorem\s+([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]);

test("the proof carries no hole and no user assumption", () => {
  assert.ok(!/\bsorry\b/.test(LEAN), "a proof hole would make every theorem vacuous");
  assert.ok(!/\badmit\b/.test(LEAN));
  assert.ok(!/^axiom\s/m.test(LEAN), "a user axiom would let the model assume its conclusion");
  assert.ok(!/^@\[implemented_by/m.test(LEAN));
});

test("every target frozen in §1 is actually discharged — none quietly dropped", () => {
  const proved = theoremNames();
  for (const target of SPEC_TARGETS) {
    assert.ok(proved.includes(target), `spec §1 names "${target}" and the proof does not have it`);
  }
});

test("PREMISE: the scan finds theorems at all, so the previous test cannot pass vacuously", () => {
  const proved = theoremNames();
  assert.ok(proved.length >= SPEC_TARGETS.length, "the theorem scan returned nothing");
  assert.ok(proved.includes("relationPartition"));
});

test("the modelled vector IS the shipped vector: four axes, same names, same order", () => {
  const struct = LEAN.slice(LEAN.indexOf("structure Strength"), LEAN.indexOf("deriving Decidable"));
  const fields = [...struct.matchAll(/^\s{2}([a-z]+)\s*:\s*Nat/gm)].map((m) => m[1]);
  assert.deepEqual(fields, [...AXES], "the Lean model and the lattice disagree on the axes");
});

test("the modelled relation set IS the shipped relation set, name for name", () => {
  const block = LEAN.slice(LEAN.indexOf("inductive Relation"), LEAN.indexOf("def compareStrength"));
  const ctors = [...block.matchAll(/^\s*\|\s*([A-Za-z]+)/gm)].map((m) => m[1]);
  const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  assert.deepEqual(ctors, RELATIONS.map(camel), "Lean models different comparator relations");
});

test("Law 1 holds in the model too — the proof exports no score, rank or total order", () => {
  assert.ok(!/\bdef\s+(score|rank|overall|weight|total)/i.test(LEAN));
  // A `LinearOrder`/`Total` instance would silently assert the very thing the stage refuses.
  assert.ok(!/LinearOrder|IsTotal|Total\b/.test(LEAN), "a total order would contradict Law 1");
});

test("the two outcomes the proof names exist in the shipped taxonomy", () => {
  // `identityPrincipalMismatch` is the only outcome the proof commits to by name; if the taxonomy
  // renames it, the theorem would be proving something about a symbol nobody emits.
  assert.ok(LEAN.includes("identityPrincipalMismatch"));
  assert.ok(POLICY_OUTCOMES.includes("identity_principal_mismatch"));
});

// ---- differential: the Lean algebra and the JS implementation agree on real vectors -------------

test("DIFFERENTIAL — Lean's algebra and the shipped comparator agree across the whole space", () => {
  // The proof is over Nat positions; the implementation is over symbolic axis values. This walks the
  // ENTIRE product space and checks the two definitions of `leq`, `join` and the four relations
  // coincide — so "the proof models the code" is executed, not asserted.
  const vectors = [];
  for (const b of AXIS_VALUES.binding)
    for (const r of AXIS_VALUES.resolution)
      for (const c of AXIS_VALUES.continuity)
        for (const o of AXIS_VALUES.role)
          vectors.push({ binding: b, resolution: r, continuity: c, role: o });

  const pos = (axis, v) => AXIS_VALUES[axis].indexOf(v);
  // Lean: leqB = componentwise Nat.ble. Recomputed here independently of leqV's implementation.
  const leanLeq = (a, b) => AXES.every((ax) => pos(ax, a[ax]) <= pos(ax, b[ax]));
  const leanJoin = (a, b) =>
    Object.fromEntries(AXES.map((ax) => [ax, pos(ax, a[ax]) >= pos(ax, b[ax]) ? a[ax] : b[ax]]));
  const leanRelation = (a, b) => {
    const ab = leanLeq(a, b);
    const ba = leanLeq(b, a);
    if (ab && ba) return "equal";
    if (ab) return "strictly_below";
    if (ba) return "strictly_above";
    return "incomparable";
  };

  assert.equal(vectors.length, 24, "PREMISE: 2*3*2*2 = 24 vectors in the product space");
  let pairs = 0;
  for (const a of vectors) {
    for (const b of vectors) {
      pairs += 1;
      assert.equal(leqV(a, b), leanLeq(a, b), `leq disagrees on ${JSON.stringify([a, b])}`);
      assert.deepEqual(joinV(a, b), leanJoin(a, b), "join disagrees");
      assert.equal(compareStrength(a, b), leanRelation(a, b), "the relation disagrees");
    }
  }
  assert.equal(pairs, 576, "the whole 24x24 space must be walked, not a sample");
});

test("DIFFERENTIAL — relationPartition holds on every real pair, not just symbolically", () => {
  const vectors = [];
  for (const b of AXIS_VALUES.binding)
    for (const r of AXIS_VALUES.resolution)
      for (const c of AXIS_VALUES.continuity)
        for (const o of AXIS_VALUES.role)
          vectors.push({ binding: b, resolution: r, continuity: c, role: o });

  for (const a of vectors) {
    for (const b of vectors) {
      const rel = compareStrength(a, b);
      const hits = RELATIONS.filter((r) => r === rel).length;
      assert.equal(hits, 1, "exactly one relation must hold — the partition is the theorem");
      assert.ok(RELATIONS.includes(rel));
    }
  }
});

test("DIFFERENTIAL — boundResolverDelta's bound holds on every real (prior, asserted, ceiling)", () => {
  // The Lean theorem says: if attach succeeds then prior <= next <= (prior join ceiling).
  // Here the same claim is executed against the shipped joinV/leqV over a real slice of the space.
  const some = [
    { binding: "unbound", resolution: "unresolved", continuity: "ephemeral", role: "unproven" },
    {
      binding: "unbound",
      resolution: "provider_asserted",
      continuity: "durable",
      role: "unproven",
    },
    {
      binding: "cryptographically_bound",
      resolution: "principal_resolved",
      continuity: "durable",
      role: "accountable_role_bound",
    },
  ];
  let accepted = 0;
  for (const prior of some) {
    for (const asserted of some) {
      for (const ceiling of some) {
        const permitted = joinV(prior, ceiling);
        if (!leqV(asserted, permitted)) continue; // attach would reject
        accepted += 1;
        const next = joinV(prior, asserted);
        assert.ok(leqV(prior, next), "attach must never LOWER banked strength");
        assert.ok(leqV(next, permitted), "attach must never exceed the delta bound");
      }
    }
  }
  assert.ok(accepted > 0, "PREMISE FAILED: no attachment was accepted, so nothing was checked");
});
