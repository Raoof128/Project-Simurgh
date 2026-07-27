// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 3 (G0): the spec's measurements must recompute from the inherited evidence.
//
// 5R-F001 is a numeric finding against a predecessor. A stage whose blade is "one seeded test is not
// evidence" does not get to publish figures nobody re-derives, so these tests recompute every one
// and then check the document agrees — at every labelled occurrence, not merely somewhere.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  measure,
  checkSpecClaims,
  normaliseNumbers,
  tenths,
  UNDER_SUPPORTED,
  ATTACKED,
} from "../../../../tools/simurgh-attestation/stage5r/core/measurements.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const E = join(ROOT, "docs/research/llm-shield/evidence/stage-5q");
const load = (p) => JSON.parse(readFileSync(join(E, p), "utf8"));
const SPEC = join(
  ROOT,
  "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md"
);

const evidence = () => ({
  closure: load("closure/function-closure.json"),
  matrix: load("closure/obligation-matrix.json"),
  receipts: load("mutation/receipts.json"),
});

// ---- the integer arithmetic rule ------------------------------------------------------------------

test("the integer rounding rule reproduces both inherited percentages exactly", () => {
  // 5Q published 6.2% and this spec published 10.5%. A rule that cannot reproduce the numbers
  // already in print is the wrong rule, however tidy.
  assert.equal(tenths(1438, 23332), 62);
  assert.equal(tenths(2118, 20213), 105);
});

test("the rounding rule is half-up and integer-only", () => {
  // The unit is TENTHS OF A PERCENT: 1438/23332 → 62 → "6.2%". Getting this wrong in the test was
  // the first thing that happened, which is the argument for pinning the unit in an assertion.
  assert.equal(tenths(1, 2), 500); // 50.0%
  assert.equal(tenths(1, 3), 333); // 33.3%, rounded down
  assert.equal(tenths(2, 3), 667); // 66.7%, rounded up
  assert.throws(() => tenths(1.5, 3), RangeError);
  assert.throws(() => tenths(1, 0), RangeError);
});

// ---- the measurements ------------------------------------------------------------------------------

test("the role histogram recomputes and sums to the inherited member count", () => {
  const m = measure(evidence());
  assert.equal(m.member_count, 2531);
  assert.equal(
    Object.values(m.role_histogram).reduce((a, b) => a + b, 0),
    2531
  );
  assert.equal(m.populated_roles, 9);
  assert.equal(m.role_histogram.completeness_claim, 582);
  assert.equal(m.role_histogram.code_allocation, 17);
  assert.equal(m.role_histogram.formal_statement, 181);
});

test("the obligation split recomputes: 15 301 under-supported + 8 031 attacked = 23 332", () => {
  const m = measure(evidence());
  assert.equal(m.obligated_cells, 23332);
  assert.equal(m.under_supported_cells, 15301);
  assert.equal(m.attacked_cells, 8031);
  assert.equal(m.under_supported_cells + m.attacked_cells, m.obligated_cells);
  assert.equal(UNDER_SUPPORTED.length + ATTACKED.length, 16);
});

test("the mutation-adequacy gap recomputes: 2 118 of 20 213, 10.5%", () => {
  const m = measure(evidence());
  assert.equal(m.mutation_tested_cells, 2118);
  assert.equal(m.discharged_class_cells, 20213);
  assert.equal(m.mutation_tested_tenths, 105);
  assert.equal(m.classes_discharged.length, 14);
});

test("six receipts were earned on cells the matrix marks omitted", () => {
  assert.equal(measure(evidence()).receipts_on_omitted, 6);
});

test("mutation reach is reported at BOTH strengths — five roles, or four once restricted", () => {
  const m = measure(evidence());
  assert.equal(m.roles_reached_any.length, 5);
  assert.equal(m.roles_reached_discharged.length, 4);
  // completeness_claim is the difference: its only mutant is M7, whose class R7 discharged nothing.
  assert.ok(m.roles_reached_any.includes("completeness_claim"));
  assert.ok(!m.roles_reached_discharged.includes("completeness_claim"));
});

test("the four unreached roles carry 26 obligations, 22 of them discharged from another role", () => {
  const m = measure(evidence());
  assert.deepEqual(Object.keys(m.unreached_roles).sort(), [
    "code_allocation",
    "evidence_emission",
    "formal_statement",
    "orchestration",
  ]);
  assert.equal(m.unreached_members, 699);
  assert.equal(m.unreached_obligations, 26);
  assert.equal(m.unreached_obligations_discharged, 22);
  // The four exceptions are R5 and R7 — the classes 5Q discharged nowhere.
  const undisch = Object.values(m.unreached_roles).flatMap((u) =>
    u.classes.filter((c) => !u.discharged.includes(c))
  );
  assert.deepEqual([...new Set(undisch)].sort(), ["R5", "R7"]);
  assert.equal(undisch.length, 4);
});

test("the family universe is 55 pairs over eight roles, and orchestration is not among them", () => {
  const m = measure(evidence());
  assert.equal(m.family_universe_pairs, 55);
  assert.equal(m.family_universe_roles.length, 8);
  assert.ok(!m.family_universe_roles.includes("orchestration"));
  assert.equal(m.a8_formal_statement_cells, 362);
});

// ---- the document must agree, at EVERY labelled occurrence -----------------------------------------

test("number separators are normalised — `15 301`, `15,301` and `15301` are one token", () => {
  assert.equal(normaliseNumbers("15 301 and 15,301 and 15301"), "15301 and 15301 and 15301");
  assert.equal(normaliseNumbers("23 332"), "23332");
});

test("G0: every labelled claim in the spec equals the recomputed value", () => {
  const m = measure(evidence());
  const r = checkSpecClaims(readFileSync(SPEC, "utf8"), m);
  assert.equal(r.ok, true, JSON.stringify(r.failures, null, 2));
  assert.ok(r.results.length >= 12);
  assert.ok(r.results.every((x) => x.ok && x.occurrences >= 1));
});

test("G0 CATCHES a stale figure — one occurrence changed is enough to fail", () => {
  // The gate that has never rejected anything is not known to work.
  const m = measure(evidence());
  const spec = readFileSync(SPEC, "utf8");
  const tampered = spec.replace(
    "cells in those fourteen classes                      20 213",
    "cells in those fourteen classes                      20 214"
  );
  assert.notEqual(tampered, spec, "tamper anchor moved — rewrite this test");
  const r = checkSpecClaims(tampered, m);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.id === "discharged_class_cells"));
});

test("G0 CATCHES a claim that has been deleted, not only one that is wrong", () => {
  const m = measure(evidence());
  const spec = readFileSync(SPEC, "utf8").replace(
    /member_count\s+2531/g,
    "member_count  (removed)"
  );
  const r = checkSpecClaims(spec, m);
  assert.equal(r.ok, false);
  assert.ok(
    r.failures.some((f) => f.id === "member_count" && /no labelled occurrence/.test(f.reason))
  );
});
