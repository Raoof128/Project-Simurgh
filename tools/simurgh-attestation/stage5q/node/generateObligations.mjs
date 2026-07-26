#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — obligation matrix generator (Task 7.7, Annex A4).
//
//   node .../generateObligations.mjs [--out <path>]
//
// Crosses the committed closure with the frozen taxonomy and writes every cell. Runs BEFORE Task 8,
// because the matrix is part of what L2 commits: the universe and the obligations over it freeze
// together, or the obligations could be sized to the attacks that happened to work.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { staticCensus, rootFor } from "../core/censusStatic.mjs";
import { generateObligations, expectedCellCounts } from "../core/obligations.mjs";

const REPO = process.cwd();
const ROLES_PATH = "tools/simurgh-attestation/stage5q/roles/stage5-roles.json";
const OUT_DEFAULT = "docs/research/llm-shield/evidence/stage-5q/closure/obligation-matrix.json";
const EXTS = new Set([".mjs", ".js", ".py", ".lean", ".sh"]);
const ROOT_DIRS = [
  "tools/simurgh-attestation",
  "tests/e2e/llmShield",
  "tests/unit/llmShield",
  "proofs",
  "scripts",
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (EXTS.has(name.slice(name.lastIndexOf(".")))) {
      acc.push(relative(REPO, full).split(sep).join("/"));
    }
  }
  return acc;
}

function main(argv) {
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : OUT_DEFAULT;

  const paths = [];
  for (const d of ROOT_DIRS) paths.push(...walk(join(REPO, d)));
  const census = staticCensus({
    files: paths
      .filter((p) => rootFor(p) !== null)
      .sort()
      .map((path) => ({ path, bytes: readFileSync(join(REPO, path)) })),
  });

  const roleFile = JSON.parse(readFileSync(ROLES_PATH, "utf8"));
  const roles = new Map(roleFile.assignments.map((a) => [a.function_id, a.security_role]));

  const result = generateObligations({ members: census.members, roles });
  const expected = expectedCellCounts({ members: census.members, roles });

  const byReason = {};
  for (const c of result.cells) {
    if (c.applicability === "omitted")
      byReason[c.omission_reason] = (byReason[c.omission_reason] ?? 0) + 1;
  }

  console.log("Stage 5Q obligation matrix — Annex A4");
  console.log(`  members            : ${census.members.length}`);
  console.log(`  cells              : ${result.cells.length}  (expected ${expected.total})`);
  console.log(
    `  obligated          : ${result.cells.filter((c) => c.applicability === "obligated").length}` +
      `  (independently computed ${expected.obligated})`
  );
  console.log(`  omitted            : ${expected.omitted}`);
  console.log("  omission reasons   :", JSON.stringify(byReason));
  console.log(`  matrix root        : ${result.obligation_matrix_root}`);
  console.log(`  problems           : ${result.problems.length}`);
  for (const p of result.problems.slice(0, 8))
    console.log(`    ✗ [${p.kind}] ${p.function_id ?? p.obligation_id}`);

  // The independent count is checked HERE, not only in the unit test: a generator that agrees with
  // itself proves nothing about the matrix it just produced.
  const obligatedActual = result.cells.filter((c) => c.applicability === "obligated").length;
  if (result.cells.length !== expected.total || obligatedActual !== expected.obligated) {
    console.log(
      "\n  FAIL: the generated matrix disagrees with an independent walk of the role table"
    );
    return 1;
  }

  mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify(
      {
        schema: "simurgh.vsr.obligation-matrix.v1",
        note:
          "Annex A4. The FULL cross product: every member against all sixteen classes, each cell " +
          "explicitly obligated or omitted with a reason from the §4.2 frozen six. planned_pack_ids " +
          "is deliberately absent (second gauntlet B6): the matrix commits WHAT MUST BE ATTACKED, " +
          "the Task 19 overlay records WHAT ATTACKED IT, and those are facts from different times.",
        member_count: census.members.length,
        cell_count: result.cells.length,
        obligated_count: obligatedActual,
        omission_reason_counts: byReason,
        obligation_matrix_root: result.obligation_matrix_root,
        cells: result.cells,
      },
      null,
      2
    )}\n`
  );
  console.log(`  written            : ${out}`);
  return result.ok ? 0 : 1;
}

// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
