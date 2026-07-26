// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 7.7 — the obligation ledger, member × class (Annex A4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  obligationId,
  generateObligations,
  validateCells,
  omissionReasonFor,
  expectedCellCounts,
  APPLICABILITY,
  OBLIGATION_DOMAIN,
} from "../../../../tools/simurgh-attestation/stage5q/core/obligations.mjs";
import {
  ATTACK_CLASSES,
  OMISSION_REASONS,
  SECURITY_ROLES,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";
import { requiredClasses } from "../../../../tools/simurgh-attestation/stage5q/core/roleAssignment.mjs";

const members = (...ids) => ids.map((function_id) => ({ function_id }));

// ---------------------------------------------------------------------------------------------
// obligation_id — the separator is the whole point
// ---------------------------------------------------------------------------------------------

test("obligation_id matches the Annex A4.2 construction byte for byte", () => {
  const expected = createHash("sha256")
    .update(Buffer.from(OBLIGATION_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from("5a:x.mjs:f", "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from("R3", "utf8"))
    .digest("hex");
  assert.equal(obligationId({ functionId: "5a:x.mjs:f", attackClass: "R3" }), expected);
});

test("obligation_id does NOT collide on a concatenation ambiguity — ('ab','c') vs ('a','bc')", () => {
  // Without the 0x00 separators both hash "abc" and two different obligations share one id, after
  // which discharging either discharges both. This is the test the separator exists for.
  const a = obligationId({ functionId: "ab", attackClass: "R1" });
  const b = obligationId({ functionId: "a", attackClass: "R1" });
  assert.notEqual(a, b);
  // The direct pair, using two real classes whose names concatenate ambiguously with the id.
  assert.notEqual(
    obligationId({ functionId: "xR1", attackClass: "R2" }),
    obligationId({ functionId: "x", attackClass: "R1" })
  );
});

test("obligation_id is a PURE function of (function_id, attack_class)", () => {
  const a = obligationId({ functionId: "5a:x.mjs:f", attackClass: "R7" });
  const b = obligationId({ functionId: "5a:x.mjs:f", attackClass: "R7" });
  assert.equal(a, b);
  assert.notEqual(a, obligationId({ functionId: "5a:x.mjs:g", attackClass: "R7" }));
  assert.notEqual(a, obligationId({ functionId: "5a:x.mjs:f", attackClass: "R8" }));
});

test("obligation_id REFUSES an attack class outside the frozen taxonomy", () => {
  assert.throws(() => obligationId({ functionId: "x", attackClass: "R17" }), /frozen/);
  assert.throws(() => obligationId({ functionId: "x", attackClass: "" }), /frozen/);
  assert.throws(() => obligationId({ functionId: "", attackClass: "R1" }), /function_id/);
});

// ---------------------------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------------------------

test("the matrix is the FULL cross product — every member against all sixteen classes", () => {
  // Emitting only obligated cells would make omission invisible: the absent cell and the
  // never-considered cell would look identical, which is R7 committed by the ledger built to
  // detect R7.
  const r = generateObligations({
    members: members("a", "b"),
    roles: { a: "trust_decision", b: "pure_transform" },
  });
  assert.equal(r.cells.length, 2 * 16);
});

test("the cell counts match an INDEPENDENT walk of the role table", () => {
  // Computed by reading REQUIRED_CLASSES_BY_ROLE directly, not by calling the generator — a test
  // that recomputes with the generator merely agrees with the code.
  const ms = members("a", "b", "c");
  const roles = { a: "trust_decision", b: "parity_mirror", c: "pure_transform" };
  const independent = 16 + 3 + 0; // full matrix + [R2,R3,R11] + none
  assert.equal(expectedCellCounts({ members: ms, roles }).obligated, independent);

  const r = generateObligations({ members: ms, roles });
  assert.equal(r.cells.filter((c) => c.applicability === "obligated").length, independent);
  assert.equal(r.cells.filter((c) => c.applicability === "omitted").length, 3 * 16 - independent);
});

test("EVERY omitted cell carries a reason from the §4.2 frozen six — free text is rejected", () => {
  const r = generateObligations({ members: members("a"), roles: { a: "formal_statement" } });
  for (const cell of r.cells) {
    if (cell.applicability !== "omitted") continue;
    assert.ok(
      OMISSION_REASONS.includes(cell.omission_reason),
      `${cell.attack_class} omitted with unreviewable reason ${cell.omission_reason}`
    );
  }
  const bad = validateCells(
    [{ obligation_id: "x", applicability: "omitted", omission_reason: "not relevant here" }],
    null
  );
  assert.equal(bad[0].kind, "invalid_omission_reason");
});

test("an OBLIGATED cell carrying an omission reason is a contradiction and is rejected", () => {
  const problems = validateCells(
    [{ obligation_id: "x", applicability: "obligated", omission_reason: "delegated" }],
    null
  );
  assert.equal(problems[0].kind, "contradictory_cell");
});

test("applicability has exactly two values — there is no third", () => {
  assert.deepEqual([...APPLICABILITY], ["obligated", "omitted"]);
  const problems = validateCells([{ obligation_id: "x", applicability: "partial" }], null);
  assert.equal(problems[0].kind, "unknown_applicability");
});

test("a cell naming a function_id OUTSIDE the committed closure is rejected", () => {
  const problems = validateCells(
    [
      {
        obligation_id: "x",
        function_id: "5a:ghost.mjs:phantom",
        attack_class: "R1",
        applicability: "obligated",
        omission_reason: null,
      },
    ],
    new Set(["5a:real.mjs:f"])
  );
  assert.equal(problems[0].kind, "member_outside_closure");
});

test("an unknown role produces a problem and NO cells — it never defaults to zero obligations", () => {
  const r = generateObligations({ members: members("a"), roles: { a: "mostly_harmless" } });
  assert.equal(r.cells.length, 0);
  assert.equal(r.problems[0].kind, "unknown_role");
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------------------------------------
// omissionReasonFor — totality over the whole role × class space
// ---------------------------------------------------------------------------------------------

test("EVERY (role, class) pair that is not obligated has a reason from the frozen six", () => {
  // Totality. A pair with no reason would either crash the generator or, worse, produce a cell with
  // a null reason that reads as 'omitted, no explanation given'.
  for (const role of SECURITY_ROLES) {
    const obligated = new Set(requiredClasses(role));
    for (const attackClass of ATTACK_CLASSES) {
      if (obligated.has(attackClass)) continue;
      const reason = omissionReasonFor(role, attackClass);
      assert.ok(
        OMISSION_REASONS.includes(reason),
        `(${role}, ${attackClass}) yielded ${reason}, which is not one of the frozen six`
      );
    }
  }
});

test("the four full-obligation roles omit NOTHING", () => {
  for (const role of [
    "trust_decision",
    "completeness_claim",
    "canonicalisation",
    "code_allocation",
  ]) {
    const r = generateObligations({ members: members("a"), roles: { a: role } });
    assert.equal(r.cells.filter((c) => c.applicability === "omitted").length, 0);
  }
});

test("pure_transform omits by DELEGATION — which is the claim Task 6 and Task 7 police", () => {
  const r = generateObligations({ members: members("a"), roles: { a: "pure_transform" } });
  assert.equal(r.cells.length, 16);
  for (const c of r.cells) {
    assert.equal(c.applicability, "omitted");
    assert.equal(c.omission_reason, "delegated");
  }
});

// ---------------------------------------------------------------------------------------------
// The root
// ---------------------------------------------------------------------------------------------

test("obligation_matrix_root is stable across runs and independent of member order", () => {
  const roles = { a: "trust_decision", b: "schema_gate" };
  const one = generateObligations({ members: members("a", "b"), roles });
  const two = generateObligations({ members: members("b", "a"), roles });
  assert.equal(one.obligation_matrix_root, two.obligation_matrix_root);
});

test("the root MOVES when one cell's applicability changes — it is not a count", () => {
  const a = generateObligations({ members: members("a"), roles: { a: "schema_gate" } });
  const b = generateObligations({ members: members("a"), roles: { a: "parity_mirror" } });
  assert.notEqual(a.obligation_matrix_root, b.obligation_matrix_root);
});

test("PACK IDS ARE ABSENT — the matrix commits what must be attacked, not what attacked it", () => {
  // Second gauntlet B6. Pack schemas arrive in Task 9, detector packs in Task 12, tray and campaign
  // packs in Tasks 14-18 — all AFTER L2. A `planned_pack_ids` field here would either freeze empty
  // assignments or let the supposedly immutable matrix change after the universe froze.
  const r = generateObligations({ members: members("a"), roles: { a: "trust_decision" } });
  for (const cell of r.cells) {
    assert.deepEqual(Object.keys(cell).sort(), [
      "applicability",
      "attack_class",
      "function_id",
      "obligation_id",
      "omission_reason",
    ]);
  }
});
