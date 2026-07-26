#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — gate census driver. Reads the live workflows and package scripts, classifies every
// step, and (with --drift) compares each manually-enumerated gate against its committed universe
// query.
//
// THIS DOES NOT REPAIR ANYTHING. Spec §14.2 prohibits touching stage-4-lean-proofs.yml during Q0:
// it is F001's live premise, and a finding whose premise no longer reproduces is a story about a
// bug rather than a bug.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { gateCensus, driftFor } from "../core/censusGate.mjs";

const REPO = process.cwd();

/** Committed universe queries, reviewable, one per gate that claims completeness over a set. */
const UNIVERSE_QUERIES = Object.freeze({
  "stage-4-lean-proofs.yml": { query: "find proofs -name '*.lean'", pattern: /\.lean$/ },
});

function workflowSteps() {
  const dir = join(REPO, ".github/workflows");
  if (!existsSync(dir)) return [];
  const steps = [];
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = readFileSync(join(dir, file), "utf8");
    // Deliberately a bounded scan of `run:` scalars rather than a YAML parse: the supported syntax
    // is pinned in the plan, and anything outside it must land as `unclassifiable` rather than be
    // silently reinterpreted.
    const blocks = text.split(/\n\s+- name:\s*/).slice(1);
    for (const block of blocks) {
      const name = block.split("\n")[0].trim();
      const runIdx = block.indexOf("run:");
      if (runIdx === -1) continue;
      steps.push({
        gate_id: `${file}::${name}`,
        source: file,
        run: block.slice(runIdx + 4),
        universe_query: UNIVERSE_QUERIES[file]?.query,
      });
    }
  }
  return steps;
}

function universeFor(file) {
  const spec = UNIVERSE_QUERIES[file];
  if (!spec) return null;
  const out = execFileSync("bash", ["-c", spec.query], { cwd: REPO, encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function main(argv) {
  const wantDrift = argv.includes("--drift");
  const steps = workflowSteps();
  const census = gateCensus({ steps });

  console.log("Stage 5Q gate census");
  console.log(`  steps classified : ${census.gates.length}`);
  console.log("  by style         :", JSON.stringify(census.counts));

  if (wantDrift) {
    console.log("\n  DRIFT (manually enumerated gates vs their committed universe):");
    for (const g of census.gates) {
      if (g.enumeration_style !== "manually_enumerated") continue;
      const universe = universeFor(g.source);
      if (!universe) {
        console.log(`    ? ${g.gate_id} — no committed universe query, drift unknowable`);
        continue;
      }
      const d = driftFor({ enumerated_items: g.enumerated_items, universe_items: universe });
      const mark = d.drifted ? "✗" : "✓";
      console.log(`    ${mark} ${g.gate_id}`);
      console.log(
        `        enumerated ${d.enumerated_count} · universe ${d.universe_count} · omitted ${d.difference.length}`
      );
      for (const miss of d.difference) console.log(`        OMITTED: ${miss}`);
    }
  }

  if (!census.ok) {
    console.log(`\n  PROBLEMS: ${census.problems.length}`);
    for (const p of census.problems.slice(0, 8)) console.log(`    ${p.gate_id}: ${p.reason}`);
    console.log("\n  Unclassifiable steps are precommit_blockers: a human must classify them.");
  }
  return 0;
}

process.exit(main(process.argv.slice(2)));
