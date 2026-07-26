#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 coverage measurement (Task 19).
//
//   node .../measureQ0Coverage.mjs [--write]
//
// Harvests every real cell-level discharge Q0 produced, derives each member's status from its
// cells, and reports whether L1 holds. It invents nothing: a cell is discharged only if some
// artifact on disk says a named pack attacked that member for that class and what happened.
//
// THREE SOURCES, AND ONLY THREE:
//
//   Task 12 mutation receipts   member × class, with a green->red->green witness. A receipt whose
//                               mutant went undetected discharges NOTHING — the pack could not
//                               tell the difference, so its pass is inadmissible (L4).
//
//   Task 14 attack packs        the six control-free probe families over every invocable tray
//                               target. A probe that could not establish its premise emits no
//                               discharge at all; three ways of learning nothing are counted and
//                               named, never folded into a pass.
//
//   Task 14 tray rows           per-cell obligation receipts emitted by the sixteen trays.
//
// The campaigns are deliberately NOT a source. A campaign attacks a COMPOSITION and names a target
// pair, not a member and a class; counting one toward a cell would discharge an obligation nobody
// aimed at. That is the P0-5 defect with a different label on it.
//
// THIS DRIVER IS EXPECTED TO REPORT L1 AS NOT CERTIFIED, and printing that plainly is the point.
// The packs discharge the five classes they can genuinely attack without a positive control; the
// other eleven classes of every member stay undischarged, so no member has all of its obligated
// cells covered and no member reaches `attacked_pass`. That is the P0-5 rule working: a member is
// claimed over ALL of its obligations, not over the ones that happened to be attacked. A coverage
// ledger that certified this state would be the false green this stage is named after, produced by
// the tool built to detect it.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { buildCoverageLedger } from "../core/coverageLedger.mjs";
import { admissibility } from "../core/harness.mjs";
import { validateDelegation } from "../core/delegation.mjs";
import { obligationId } from "../core/obligations.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const OUT = `${E}/coverage/discharge-ledger.json`;

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/**
 * Cell discharges from the Task 12 receipts.
 *
 * An UNDETECTED mutant yields no discharge at all rather than a failed one: the pack was run and
 * learned nothing, and "we attacked it and the detector stayed silent" is not a status in the
 * frozen four. It is recorded in the receipt and reported here as a separate count.
 */
export function dischargesFromMutants(receipts) {
  const out = [];
  const undetected = [];
  for (const r of receipts) {
    const proved =
      r.baseline_exit === 0 &&
      Number.isInteger(r.mutated_exit) &&
      r.mutated_exit !== 0 &&
      r.restored_exit === 0;
    if (!proved) {
      undetected.push({ mutant_id: r.mutant_id, attack_class: r.attack_class });
      continue;
    }
    out.push({
      obligation_id: obligationId({
        functionId: r.target_function_id,
        attackClass: r.attack_class,
      }),
      function_id: r.target_function_id,
      attack_class: r.attack_class,
      pack_id: r.detecting_pack_id ?? null,
      premise_receipt_digest: r.mutation_digest ?? null,
      observed_outcome: "mutation_detected",
      discharge_status: "attacked_pass",
      finding_ids: [],
      source: `mutation_receipt:${r.mutant_id}`,
    });
  }
  return { discharges: out, undetected };
}

/**
 * Cell discharges from the attack packs.
 *
 * Finding ids are ATTACHED HERE FROM THE LEDGER, not minted. The pack runner deliberately emits
 * `finding_ids: []`: the ledger owns the sequence, and a runner that allocated its own would create
 * a second authority over one namespace that collides the first time either is re-run. A pack
 * finding with no matching ledger record is a finding that was observed and never frozen, so it is
 * reported rather than passed through.
 */
export function dischargesFromPacks(packResults, findingIdByCell = new Map()) {
  const out = [];
  const unfrozenFindings = [];
  for (const d of packResults.discharges ?? []) {
    const key = `${d.function_id}|${d.attack_class}`;
    const findingId = findingIdByCell.get(key) ?? null;
    if (d.discharge_status === "finding_frozen" && !findingId) {
      unfrozenFindings.push(key);
      continue;
    }
    out.push({
      obligation_id: d.obligation_id,
      function_id: d.function_id,
      attack_class: d.attack_class,
      pack_id: d.pack_id,
      premise_receipt_digest: d.premise_receipt_digest,
      observed_outcome: d.observed_outcome,
      discharge_status: d.discharge_status,
      finding_ids: findingId ? [findingId] : [],
      source: d.source,
    });
  }
  return { discharges: out, unfrozenFindings };
}

/** Cell discharges from the sixteen tray records. Rows with a null status contribute nothing. */
export function dischargesFromTrays(trays) {
  const out = [];
  for (const tray of trays) {
    for (const row of tray.obligation_receipts ?? []) {
      if (!row.discharge_status) continue;
      out.push({
        obligation_id: obligationId({
          functionId: row.function_id,
          attackClass: row.attack_class,
        }),
        function_id: row.function_id,
        attack_class: row.attack_class,
        pack_id: row.pack_id ?? null,
        premise_receipt_digest: row.premise_receipt_digest ?? null,
        observed_outcome: row.observed_outcome ?? null,
        discharge_status: row.discharge_status,
        finding_ids: row.finding_ids ?? [],
        source: `tray:${tray.tray_id}`,
      });
    }
  }
  return out;
}

function main(argv) {
  const closure = readJson(`${E}/closure/function-closure.json`);
  const matrix = readJson(`${E}/closure/obligation-matrix.json`);
  const receiptsPath = `${E}/mutation/receipts.json`;
  const receipts = existsSync(receiptsPath) ? readJson(receiptsPath).receipts : [];

  const trayDir = `${E}/trays`;
  const trays = existsSync(trayDir)
    ? readdirSync(trayDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => readJson(`${trayDir}/${f}`))
    : [];

  const packPath = `${E}/packs/all-pack-results.json`;
  const ledgerPath = `${E}/findings/q0-finding-ledger.json`;
  const findingIdByCell = new Map();
  if (existsSync(ledgerPath)) {
    for (const r of readJson(ledgerPath).records) {
      findingIdByCell.set(`${r.affected_function_id}|${r.attack_class}`, r.finding_id);
    }
  }
  const fromPacks = existsSync(packPath)
    ? dischargesFromPacks(readJson(packPath), findingIdByCell)
    : { discharges: [], unfrozenFindings: [] };

  const fromMutants = dischargesFromMutants(receipts);
  const fromTrays = dischargesFromTrays(trays);

  // THE TRAYS ARE CANONICAL ONCE THEY EXIST, AND THE RAW PACK RESULTS ARE NOT ADDED ON TOP.
  //
  // A tray is built FROM the pack results, so its rows are the same evidence in the artifact a
  // reviewer actually reads. Counting both produced 1430 `duplicate_discharge` problems on the
  // first run — one per cell, every one of them the same pack reported twice through two paths.
  // The rule was right and the wiring was wrong: two readings of one measurement are not two
  // measurements, and a coverage number that grew because the evidence was filed in two places
  // would be the most embarrassing possible defect in a stage about false completeness.
  const packsAlreadyInTrays = fromTrays.length > 0;
  const discharges = [
    ...fromMutants.discharges,
    ...(packsAlreadyInTrays ? [] : fromPacks.discharges),
    ...fromTrays,
  ];

  const built = buildCoverageLedger({
    members: closure.members.map((m) => ({ function_id: m.function_id })),
    cells: matrix.cells,
    discharges,
    admissibility: admissibility(receipts),
    delegation: new Map(),
  });

  // §2.7's delegation rules are INVOKED here, not merely unit-tested in Task 7 (gauntlet P1-14).
  // Statuses are the ones this ledger derived, so the check runs over the real answer rather than
  // over a fixture — and its problems are reported even though no member currently delegates.
  const statuses = new Map(built.rows.map((r) => [r.function_id, r.coverage_status]));
  const callers = new Map(
    closure.members.map((m) => [m.function_id, [...(m.reachable_from ?? [])]])
  );
  const delegationCheck = validateDelegation({
    members: closure.members.map((m) => ({ function_id: m.function_id })),
    statuses,
    callers,
  });

  console.log("Stage 5Q — Q0 coverage and discharge ledger (L1)");
  console.log(`  members                     : ${built.rows.length}`);
  console.log(`  cells                       : ${built.cells_total}`);
  console.log(
    `  obligated cells             : ${built.cells_obligated}` +
      `  (discharged ${built.cells_obligated_discharged})`
  );
  console.log(
    `  discharges harvested        : ${discharges.length}` +
      `  (on omitted cells ${built.cells_discharged_on_omitted}, ` +
      `outside the matrix ${built.discharges_outside_the_matrix})`
  );
  console.log(`      from mutation receipts  : ${fromMutants.discharges.length}`);
  console.log(
    `      from attack packs       : ${fromPacks.discharges.length}` +
      (packsAlreadyInTrays ? "  (counted via the trays, not again)" : "")
  );
  console.log(`      from tray rows          : ${fromTrays.length}`);
  console.log(`      mutants proving nothing : ${fromMutants.undetected.length}`);
  console.log(`  status tally                : ${JSON.stringify(built.tally)}`);
  console.log(`  members with NO status      : ${built.unstatused.length}`);
  console.log(`  ledger problems             : ${built.problems.length}`);
  for (const p of built.problems.slice(0, 6)) {
    console.log(`      ✗ ${p.kind}  ${p.function_id ?? p.obligation_id ?? ""}`);
  }
  if (built.problems.length > 6) console.log(`      … and ${built.problems.length - 6} more`);
  console.log(
    `  delegation (§2.7)           : ${delegationCheck.problems.length} problem(s) over ` +
      `${built.rows.length} members`
  );
  console.log(`  coverage_discharge_root     : ${built.coverage_discharge_root}`);
  console.log(`  ledger_digest               : ${built.ledger_digest}`);
  console.log(`\n  L1 CERTIFIED                : ${built.l1_certified ? "YES" : "NO"}`);
  for (const reason of built.l1_reasons) console.log(`      ${reason}`);
  if (!built.l1_certified) {
    console.log(
      "\n  L1 is No Unexamined Function. NOT certified, and that is the measurement rather than a\n" +
        "  tooling failure. The six probe families attack five of the sixteen classes without\n" +
        "  needing a positive control; the other eleven need one, and synthesising a valid input\n" +
        "  for a function whose signature nobody recorded is how a vacuous pass gets manufactured.\n" +
        "  So those cells stay undischarged and are counted, and no member reaches attacked_pass\n" +
        "  while any of its obligated cells is untouched. No attestation may claim coverage here."
    );
  }

  if (argv.includes("--write")) {
    const payload = {
      schema: "simurgh.vsr.q0-discharge-ledger.v1",
      note:
        "Bottom-up (Annex A4.3): cells are discharged and member status is DERIVED. A status " +
        "supplied as input is refused, and a member that derives to nothing is left null rather " +
        "than defaulted. l1_certified is the honest gate, not a summary of intent.",
      closure_digest: readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim(),
      obligation_matrix_root: matrix.obligation_matrix_root,
      l1_certified: built.l1_certified,
      l1_reasons: built.l1_reasons,
      cells_total: built.cells_total,
      cells_obligated: built.cells_obligated,
      cells_obligated_discharged: built.cells_obligated_discharged,
      cells_discharged_on_omitted: built.cells_discharged_on_omitted,
      discharges_outside_the_matrix: built.discharges_outside_the_matrix,
      discharge_sources: {
        mutation_receipts: fromMutants.discharges.length,
        attack_packs: fromPacks.discharges.length,
        pack_findings_not_in_the_ledger: fromPacks.unfrozenFindings,
        tray_rows: fromTrays.length,
        mutants_proving_nothing: fromMutants.undetected,
      },
      status_tally: built.tally,
      members_without_status: built.unstatused.length,
      ledger_problems: built.problems,
      delegation_problems: delegationCheck.problems.length,
      coverage_discharge_root: built.coverage_discharge_root,
      ledger_digest: built.ledger_digest,
      discharges,
      // The Annex A2 overlay. One row per committed member, exactly three fields, no additions.
      overlay: built.overlay,
    };
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`\n  written                     : ${OUT}`);
  } else {
    console.log("\n  (dry run — pass --write to emit the ledger)");
  }

  // EXIT 0 EVEN WHEN L1 IS NOT CERTIFIED. This driver MEASURES; the attestation is what must
  // refuse. A measurement tool that fails the build turns an uncomfortable number into something
  // to be made to go away, and the number is the deliverable.
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
