// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 19 — the Q0 coverage and discharge ledger (L1, bottom-up).
//
// The ledger's only job is to refuse to say more than it knows. Every test here is a way it could
// have said more: a status asserted instead of derived, a member defaulted instead of left null, a
// pass standing on a class no mutant ever proved detectable, a cell discharged twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  buildCoverageLedger,
  deriveMemberStatus,
  indexDischarges,
  MECHANICAL_OMISSION_REASONS,
} from "../../../../tools/simurgh-attestation/stage5q/core/coverageLedger.mjs";
import { obligationId } from "../../../../tools/simurgh-attestation/stage5q/core/obligations.mjs";
import {
  dischargesFromMutants,
  dischargesFromTrays,
} from "../../../../tools/simurgh-attestation/stage5q/node/measureQ0Coverage.mjs";
import { COVERAGE_STATUSES } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const LEDGER = "docs/research/llm-shield/evidence/stage-5q/coverage/discharge-ledger.json";

const cell = (fn, cls, applicability = "obligated", omission_reason = null) => ({
  obligation_id: obligationId({ functionId: fn, attackClass: cls }),
  function_id: fn,
  attack_class: cls,
  applicability,
  omission_reason,
});

const discharge = (fn, cls, over = {}) => ({
  obligation_id: obligationId({ functionId: fn, attackClass: cls }),
  function_id: fn,
  attack_class: cls,
  pack_id: `5q-x-${cls.toLowerCase()}-01`,
  premise_receipt_digest: "a".repeat(64),
  observed_outcome: "refused_as_expected",
  discharge_status: "attacked_pass",
  finding_ids: [],
  ...over,
});

const admitAll = { isAdmissible: () => true };
const admitNone = { isAdmissible: () => false };

// ------------------------------------------------------------------------------------------------
// Derivation.
// ------------------------------------------------------------------------------------------------

test("attacked_pass requires EVERY obligated cell — one gap blocks it (P0-5)", () => {
  const fn = "5a:m.mjs:f";
  const cells = [cell(fn, "R1"), cell(fn, "R3")];
  const { byObligation } = indexDischarges([discharge(fn, "R1")]);
  const d = deriveMemberStatus({ cells, discharges: byObligation });
  assert.equal(d.status, null);
  assert.match(d.reason, /1 of 2 obligated cell\(s\) undischarged/);
  assert.deepEqual(d.blocking, [cells[1].obligation_id]);
});

test("attacked_pass when every obligated cell is discharged", () => {
  const fn = "5a:m.mjs:f";
  const cells = [cell(fn, "R1"), cell(fn, "R3")];
  const { byObligation } = indexDischarges([discharge(fn, "R1"), discharge(fn, "R3")]);
  assert.equal(deriveMemberStatus({ cells, discharges: byObligation }).status, "attacked_pass");
});

test("a finding beats a full sweep of passes", () => {
  // The strongest thing the ledger can say about a member is never softened by other cells passing.
  const fn = "5a:m.mjs:f";
  const cells = [cell(fn, "R1"), cell(fn, "R3")];
  const { byObligation } = indexDischarges([
    discharge(fn, "R1"),
    discharge(fn, "R3", { finding_ids: ["5Q-F009"] }),
  ]);
  assert.equal(deriveMemberStatus({ cells, discharges: byObligation }).status, "finding_frozen");
});

test("mechanically_unreachable only when every cell is omitted for a MECHANICAL reason", () => {
  const fn = "5a:m.mjs:f";
  const cells = [
    cell(fn, "R1", "omitted", "no_such_input_surface"),
    cell(fn, "R4", "omitted", "no_trust_decision"),
  ];
  const { byObligation } = indexDischarges([]);
  assert.equal(
    deriveMemberStatus({ cells, discharges: byObligation }).status,
    "mechanically_unreachable"
  );
});

test("'delegated' is NOT a mechanical reason — it needs a validated caller", () => {
  // Otherwise a member discharges itself by pointing at a caller nobody attacked, which is the
  // whole failure validateDelegation exists to catch.
  assert.equal(MECHANICAL_OMISSION_REASONS.includes("delegated"), false);
  const fn = "5a:m.mjs:f";
  const cells = [cell(fn, "R1", "omitted", "delegated")];
  const { byObligation } = indexDischarges([]);
  const without = deriveMemberStatus({ cells, discharges: byObligation });
  assert.equal(without.status, null);
  assert.match(without.reason, /no validated caller/);
  const with_ = deriveMemberStatus({
    cells,
    discharges: byObligation,
    delegatesTo: "5a:m.mjs:caller",
  });
  assert.equal(with_.status, "delegated_to_attacked_caller");
});

test("a member with no cells derives nothing — the absent cell is not the omitted cell", () => {
  const d = deriveMemberStatus({ cells: [], discharges: new Map() });
  assert.equal(d.status, null);
  assert.match(d.reason, /no obligation cells/);
});

// ------------------------------------------------------------------------------------------------
// Refusals.
// ------------------------------------------------------------------------------------------------

test("a member status supplied as INPUT is refused, not overwritten", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn, coverage_status: "attacked_pass" }],
    cells: [cell(fn, "R1")],
    discharges: [],
  });
  const kinds = built.problems.map((p) => p.kind);
  assert.ok(kinds.includes("member_status_written_directly"));
  // And it did NOT take effect.
  assert.equal(built.rows[0].coverage_status, null);
});

test("a member appearing twice is refused", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }, { function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [],
  });
  assert.ok(built.problems.some((p) => p.kind === "duplicate_member"));
});

test("a member with no cells is refused, and is not defaulted to a status", () => {
  const built = buildCoverageLedger({
    members: [{ function_id: "5a:m.mjs:f" }],
    cells: [],
    discharges: [],
  });
  assert.ok(built.problems.some((p) => p.kind === "member_without_cells"));
  assert.equal(built.rows[0].coverage_status, null);
  assert.equal(built.unstatused.length, 1);
  assert.equal(built.l1_certified, false);
});

test("a fifth status value is rejected", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [discharge(fn, "R1", { discharge_status: "probably_fine" })],
  });
  assert.equal(COVERAGE_STATUSES.length, 4);
  assert.ok(built.problems.some((p) => p.kind === "unknown_discharge_status"));
});

test("an attacked_pass whose class has no mutation receipt is rejected at publication (L4)", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [discharge(fn, "R1")],
    admissibility: admitNone,
  });
  const p = built.problems.find((x) => x.kind === "inadmissible_pass");
  assert.ok(p);
  assert.match(p.reason, /green->red->green/);
  // The same ledger with an admissible class has no such problem.
  const ok = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [discharge(fn, "R1")],
    admissibility: admitAll,
  });
  assert.equal(ok.problems.filter((x) => x.kind === "inadmissible_pass").length, 0);
});

test("the SAME pack discharging one cell twice is outcome shopping", () => {
  const fn = "5a:m.mjs:f";
  const { problems } = indexDischarges([
    discharge(fn, "R1", { pack_id: "same" }),
    discharge(fn, "R1", { pack_id: "same" }),
  ]);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "duplicate_discharge");
});

test("TWO packs agreeing on one cell is corroboration, not a problem", () => {
  // The first version of this rule refused any second discharge and immediately fired on three
  // legitimate cells where a Task 12 mutant and a Task 14 pack had both attacked the same
  // (member, class) by different means. A rule that refuses corroboration teaches its author to
  // stop corroborating.
  const fn = "5a:m.mjs:f";
  const { byObligation, problems } = indexDischarges([
    discharge(fn, "R1", { pack_id: "mutant" }),
    discharge(fn, "R1", { pack_id: "probe" }),
  ]);
  assert.deepEqual(problems, []);
  assert.deepEqual([...byObligation.values()][0].corroborating_pack_ids, ["probe"]);
});

test("TWO packs DISAGREEING on one cell is a conflict, and no ordering rule resolves it", () => {
  const fn = "5a:m.mjs:f";
  const { problems } = indexDischarges([
    discharge(fn, "R1", { pack_id: "a", discharge_status: "attacked_pass" }),
    discharge(fn, "R1", { pack_id: "b", discharge_status: "finding_frozen", finding_ids: ["X"] }),
  ]);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "conflicting_discharge");
  assert.deepEqual(problems[0].statuses, ["attacked_pass", "finding_frozen"]);
});

test("a discharge naming a member outside the closure is refused", () => {
  const built = buildCoverageLedger({
    members: [{ function_id: "5a:m.mjs:f" }],
    cells: [cell("5a:m.mjs:f", "R1")],
    discharges: [discharge("5z:ghost.mjs:g", "R1")],
  });
  assert.ok(built.problems.some((p) => p.kind === "discharge_outside_closure"));
});

test("a discharge on an OMITTED cell is counted apart and never toward coverage", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1"), cell(fn, "R4", "omitted", "no_trust_decision")],
    discharges: [discharge(fn, "R4")],
  });
  assert.equal(built.cells_obligated, 1);
  assert.equal(built.cells_obligated_discharged, 0);
  assert.equal(built.cells_discharged_on_omitted, 1);
  // Extra work does not become coverage of the work that was asked for.
  assert.equal(built.l1_certified, false);
});

// ------------------------------------------------------------------------------------------------
// The L1 gate and byte-stability.
// ------------------------------------------------------------------------------------------------

test("L1 certifies only when every member is statused and every obligated cell discharged", () => {
  const fn = "5a:m.mjs:f";
  const cells = [cell(fn, "R1"), cell(fn, "R2", "omitted", "no_such_input_surface")];
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells,
    discharges: [discharge(fn, "R1")],
    admissibility: admitAll,
  });
  assert.equal(built.l1_certified, true);
  assert.deepEqual(built.l1_reasons, []);
  assert.equal(built.tally.attacked_pass, 1);
});

test("L1 names its reasons — 'not certified' alone is not actionable", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [],
  });
  assert.equal(built.l1_certified, false);
  assert.equal(built.l1_reasons.length, 2);
  assert.match(built.l1_reasons.join(" "), /derive no status/);
  assert.match(built.l1_reasons.join(" "), /obligated cells undischarged/);
});

test("the ledger is byte-stable across two builds of the same inputs", () => {
  const fn = "5a:m.mjs:f";
  const args = {
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1"), cell(fn, "R3")],
    discharges: [discharge(fn, "R1")],
    admissibility: admitAll,
  };
  const a = buildCoverageLedger(args);
  const b = buildCoverageLedger(args);
  assert.equal(a.ledger_digest, b.ledger_digest);
  assert.equal(a.coverage_discharge_root, b.coverage_discharge_root);
});

test("the overlay carries exactly the Annex A2 three fields, one row per member", () => {
  const fn = "5a:m.mjs:f";
  const built = buildCoverageLedger({
    members: [{ function_id: fn }],
    cells: [cell(fn, "R1")],
    discharges: [discharge(fn, "R1", { pack_id: "5q-x-r1-01" })],
    admissibility: admitAll,
  });
  assert.equal(built.overlay.length, 1);
  assert.deepEqual(Object.keys(built.overlay[0]).sort(), [
    "attack_pack_ids",
    "coverage_status",
    "function_id",
  ]);
  assert.deepEqual(built.overlay[0].attack_pack_ids, ["5q-x-r1-01"]);
});

// ------------------------------------------------------------------------------------------------
// Harvesting.
// ------------------------------------------------------------------------------------------------

test("an UNDETECTED mutant discharges nothing", () => {
  // "We attacked it and the detector stayed silent" is not a status in the frozen four. Recording
  // it as one would make the least informative outcome look like the most reassuring.
  const { discharges, undetected } = dischargesFromMutants([
    {
      mutant_id: "M1",
      attack_class: "R1",
      target_function_id: "5a:m.mjs:f",
      baseline_exit: 0,
      mutated_exit: 1,
      restored_exit: 0,
      detecting_pack_id: "p",
    },
    {
      mutant_id: "M5",
      attack_class: "R5",
      target_function_id: "5g:m.mjs:g",
      baseline_exit: 0,
      mutated_exit: 0,
      restored_exit: 0,
      detecting_pack_id: "p",
    },
  ]);
  assert.equal(discharges.length, 1);
  assert.equal(discharges[0].attack_class, "R1");
  assert.deepEqual(undetected, [{ mutant_id: "M5", attack_class: "R5" }]);
});

test("a mutant whose baseline was already RED discharges nothing", () => {
  const { discharges } = dischargesFromMutants([
    {
      mutant_id: "M11",
      attack_class: "R11",
      target_function_id: "5p:m.mjs:f",
      baseline_exit: 1,
      mutated_exit: 1,
      restored_exit: 1,
    },
  ]);
  assert.deepEqual(discharges, []);
});

test("tray rows with a null discharge_status contribute nothing", () => {
  const rows = dischargesFromTrays([
    {
      tray_id: "tray-5a",
      obligation_receipts: [
        { function_id: "5a:m.mjs:f", attack_class: "R1", discharge_status: null },
        { function_id: "5a:m.mjs:f", attack_class: "R3", discharge_status: "attacked_pass" },
      ],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].attack_class, "R3");
});

// ------------------------------------------------------------------------------------------------
// The committed ledger.
// ------------------------------------------------------------------------------------------------

test("the committed Q0 ledger reports L1 as NOT certified, with its reasons", () => {
  // This assertion is the stage being honest about itself. If it ever flips to true, it must be
  // because cells were attacked — not because the gate was relaxed.
  if (!existsSync(LEDGER)) return;
  const j = JSON.parse(readFileSync(LEDGER, "utf8"));
  assert.equal(j.l1_certified, false);
  assert.ok(j.l1_reasons.length > 0);
  // Nine members now derive `finding_frozen` from the attack packs; the rest derive nothing.
  assert.equal(j.members_without_status, 2522);
  assert.ok(j.cells_obligated_discharged < j.cells_obligated);
});

test("the committed ledger's overlay covers every member exactly once", () => {
  if (!existsSync(LEDGER)) return;
  const j = JSON.parse(readFileSync(LEDGER, "utf8"));
  const ids = j.overlay.map((o) => o.function_id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 2531);
});
