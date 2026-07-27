// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Tasks 4 and 5: the family universe and the immutable first tranche.
//
// §5.4 freezes the RULE, not the membership. These tests apply the rule to the inherited matrix and
// check the result against every number the spec publishes about it — including the one the spec adds
// on purpose (A8) and the one Ruling 2 says the universe cannot reach (`orchestration`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  buildUniverse,
  buildTranche,
  reachableArchetypes,
  ARCHETYPE_OF,
  UNMAPPED_ROLES,
  TRANCHE_T1,
} from "../../../../tools/simurgh-attestation/stage5r/core/archetypes.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const E = join(ROOT, "docs/research/llm-shield/evidence/stage-5q");
const load = (p) => JSON.parse(readFileSync(join(E, p), "utf8"));
const evidence = () => ({
  closure: load("closure/function-closure.json"),
  matrix: load("closure/obligation-matrix.json"),
});

// ---- the archetypes --------------------------------------------------------------------------------

test("A1–A8 cover the nine populated roles, with A7 carrying two", () => {
  assert.equal(new Set(Object.values(ARCHETYPE_OF)).size, 8);
  assert.equal(ARCHETYPE_OF.orchestration, "A7");
  assert.equal(ARCHETYPE_OF.parity_mirror, "A7");
  assert.equal(ARCHETYPE_OF.formal_statement, "A8");
  for (const role of UNMAPPED_ROLES) assert.equal(ARCHETYPE_OF[role], undefined);
});

// ---- the universe ----------------------------------------------------------------------------------

test("§5.4's rule yields exactly 55 pairs, and each generates at least one obligated cell", () => {
  const { pairs } = buildUniverse(evidence());
  assert.equal(pairs.length, 55);
  for (const p of pairs) assert.ok(p.inherited_5q_obligation_cells >= 1, JSON.stringify(p));
});

test("the universe is restricted to the eleven under-supported classes", () => {
  const { pairs } = buildUniverse(evidence());
  const classes = [...new Set(pairs.map((p) => p.attack_class))].sort();
  assert.equal(classes.length, 11);
  for (const attacked of ["R1", "R8", "R9", "R15", "R16"]) {
    assert.ok(!classes.includes(attacked), `${attacked} was attacked by 5Q and is out of scope`);
  }
});

test("the universe reaches eight roles, and every pair carries an archetype", () => {
  const { pairs, roles } = buildUniverse(evidence());
  assert.equal(roles.length, 8);
  for (const p of pairs) assert.ok(p.role_archetype, `${p.attack_class}×${p.target_security_role}`);
});

test("RULING 2: orchestration is unreachable, and the REASON is recorded as data", () => {
  const { roles, unreachable_roles } = buildUniverse(evidence());
  assert.ok(!roles.includes("orchestration"));
  const o = unreachable_roles.find((u) => u.role === "orchestration");
  assert.ok(o, "orchestration must appear in the unreachable list, not merely be absent");
  assert.deepEqual(o.obligated_under, ["R9", "R16"]);
  assert.match(o.reason, /none of which is under-supported/);
  assert.equal(o.role_archetype, "A7");
});

test("A7's floor is still reachable — through parity_mirror alone", () => {
  const { pairs } = buildUniverse(evidence());
  const a7 = pairs.filter((p) => p.role_archetype === "A7");
  assert.ok(a7.length > 0);
  assert.ok(a7.every((p) => p.target_security_role === "parity_mirror"));
  assert.deepEqual(reachableArchetypes(pairs), ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
});

test("A8 is present and carries the 362 cells §5.2 names", () => {
  const { pairs } = buildUniverse(evidence());
  const a8 = pairs.filter((p) => p.role_archetype === "A8");
  assert.deepEqual(
    a8.map((p) => p.attack_class),
    ["R7", "R10"]
  );
  assert.equal(
    a8.reduce((a, p) => a + p.inherited_5q_obligation_cells, 0),
    362
  );
});

test("the universe totals the 15 301 under-supported cells, with no double counting", () => {
  const { pairs } = buildUniverse(evidence());
  assert.equal(
    pairs.reduce((a, p) => a + p.inherited_5q_obligation_cells, 0),
    15301
  );
  const keys = pairs.map((p) => `${p.attack_class}|${p.target_security_role}`);
  assert.equal(new Set(keys).size, keys.length, "a pair appears twice");
});

test("the universe is emitted in a canonical order, so the ledger describes a set", () => {
  const a = buildUniverse(evidence()).pairs;
  const b = buildUniverse(evidence()).pairs;
  assert.deepEqual(a, b);
  const keys = a.map((p) => `${p.attack_class}|${p.target_security_role}`);
  assert.deepEqual(
    keys,
    [...keys].sort((x, y) => {
      const [cx, rx] = x.split("|");
      const [cy, ry] = y.split("|");
      return Number(cx.slice(1)) - Number(cy.slice(1)) || rx.localeCompare(ry);
    })
  );
});

// ---- the tranche -----------------------------------------------------------------------------------

test("T1 is eight families covering all eight reachable archetypes", () => {
  const { pairs } = buildUniverse(evidence());
  const t = buildTranche(pairs);
  assert.equal(t.families.length, 8);
  assert.deepEqual(t.archetypes, ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
  assert.deepEqual(t.archetypes, reachableArchetypes(pairs));
});

test("T1 spans 2 406 inherited cells — the SPAN, which is not the delta", () => {
  const t = buildTranche(buildUniverse(evidence()).pairs);
  assert.equal(t.spanned_cells, 2406);
  // Ruling 1: a family discharges the cells it actually probed, never the size of its pair.
  assert.ok(t.spanned_cells < 15301);
});

test("every T1 family is a member of the universe, with the same cell count", () => {
  const { pairs } = buildUniverse(evidence());
  const index = new Map(pairs.map((p) => [`${p.attack_class}|${p.target_security_role}`, p]));
  for (const f of buildTranche(pairs).families) {
    const key = `${f.attack_class}|${f.target_security_role}`;
    assert.ok(index.has(key), `${f.family} is outside the universe`);
    assert.equal(f.inherited_5q_obligation_cells, index.get(key).inherited_5q_obligation_cells);
  }
});

test("the three roles no mutant ever reached lead the tranche, and say so", () => {
  const t = buildTranche(buildUniverse(evidence()).pairs);
  const thin = t.families.filter((f) => /no mutation evidence/.test(f.selection_basis));
  assert.deepEqual(thin.map((f) => f.target_security_role).sort(), [
    "code_allocation",
    "evidence_emission",
    "formal_statement",
  ]);
  assert.deepEqual(
    thin.map((f) => f.family),
    ["F1", "F2", "F3"]
  );
});

test("F2 uses R10 rather than R7 — a floor family must not depend on lifting an inadmissible class", () => {
  const f2 = TRANCHE_T1.find((t) => t.family === "F2");
  assert.equal(f2.attack_class, "R10");
  assert.notEqual(f2.attack_class, "R7");
});

test("a tranche naming a pair outside the universe fails closed", () => {
  const { pairs } = buildUniverse(evidence());
  const thinned = pairs.filter((p) => p.target_security_role !== "formal_statement");
  assert.throws(() => buildTranche(thinned), /not in the universe/);
});
