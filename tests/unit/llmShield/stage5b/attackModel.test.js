// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — attack model (plan Task 5). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTACK_DESIGN_COUNTS,
  deriveAttacks,
  familyCounts,
  applyFieldOps,
} from "../../../../tools/simurgh-attestation/stage5b/core/attackModel.mjs";
import {
  VAR_ATTACK_FAMILIES,
  VAR_TARGET_STAGES,
  VAR_EXPECTED_ATTACK_TOTAL,
  VAR_OUTCOME_CLASSES,
} from "../../../../tools/simurgh-attestation/stage5b/constants.mjs";

test("design counts sum to 46 over the 7 declared families", () => {
  assert.deepEqual(Object.keys(ATTACK_DESIGN_COUNTS).sort(), [...VAR_ATTACK_FAMILIES].sort());
  const sum = Object.values(ATTACK_DESIGN_COUNTS).reduce((a, b) => a + b, 0);
  assert.equal(sum, VAR_EXPECTED_ATTACK_TOTAL);
});

test("deriveAttacks yields 46 specs with stable, unique, sorted ids", () => {
  const attacks = deriveAttacks();
  assert.equal(attacks.length, 46);
  const ids = attacks.map((a) => a.attack_id);
  assert.equal(new Set(ids).size, 46);
  assert.deepEqual(ids, [...ids].sort());
  // determinism
  assert.deepEqual(
    deriveAttacks().map((a) => a.attack_id),
    ids
  );
});

test("every attack is well-typed (family, target, outcome, capture tag)", () => {
  for (const a of deriveAttacks()) {
    assert.ok(VAR_ATTACK_FAMILIES.includes(a.family));
    assert.ok([...VAR_TARGET_STAGES, "self", "all"].includes(a.target_stage));
    assert.ok(VAR_OUTCOME_CLASSES.includes(a.expected_outcome));
    assert.equal(typeof a.capture_grounded, "boolean");
    assert.equal(typeof a.kind, "string");
  }
});

test("the four ★ capture-grounded families are tagged; the tail is not", () => {
  const grounded = new Set(
    deriveAttacks()
      .filter((a) => a.capture_grounded)
      .map((a) => a.family)
  );
  assert.deepEqual([...grounded].sort(), [
    "capture_substitution",
    "conflict_laundering",
    "residue_paraphrase_slip",
    "silent_cell_hide",
  ]);
});

test("residue family spans BOTH gates (4x and 4y) and is floor-reconciled", () => {
  const res = deriveAttacks().filter((a) => a.family === "residue_paraphrase_slip");
  assert.ok(res.every((a) => a.floor_reconciled === true));
  const targets = new Set(res.map((a) => a.target_stage));
  assert.deepEqual([...targets].sort(), ["4x", "4y"]);
});

test("familyCounts() equals the design counts", () => {
  assert.deepEqual(familyCounts(), ATTACK_DESIGN_COUNTS);
});

test("applyFieldOps is a pure deep-clone mutator (set / delete)", () => {
  const src = { a: { b: 1 }, c: [1, 2] };
  const out = applyFieldOps(src, [
    { path: "a.b", op: "set", value: 9 },
    { path: "c", op: "delete" },
  ]);
  assert.deepEqual(out, { a: { b: 9 } });
  assert.deepEqual(src, { a: { b: 1 }, c: [1, 2] }); // source untouched
});
