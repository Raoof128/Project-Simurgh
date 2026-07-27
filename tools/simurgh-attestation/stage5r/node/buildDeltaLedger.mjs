// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 23: write the delta ledger.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildDeltaLedger.mjs [--output <path>]
//
// Deterministic: every figure is derived from the committed campaign cells, and the two 5Q-era
// numbers are constants the schema has no field to override.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildDeltaLedger } from "../core/deltaLedger.mjs";
import { fourTermDisclosure, cumulativeView, familyResultCensus } from "../core/ledgers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CAMPAIGN = "docs/research/llm-shield/evidence/stage-5r/campaign";
export const DELTA_PATH = "docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json";

/**
 * Read every cell the campaign probed, split by terminal state.
 *
 * @param {string} root
 * @returns {{cells: Array<object>, result: object, pairs: object}}
 */
export function readCampaign(root) {
  const dir = join(root, CAMPAIGN, "cells");
  const cells = readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()
    .flatMap((n) => JSON.parse(readFileSync(join(dir, n), "utf8")).cells);
  return {
    cells,
    result: JSON.parse(readFileSync(join(root, CAMPAIGN, "campaign-result.json"), "utf8")),
    pairs: JSON.parse(readFileSync(join(root, CAMPAIGN, "pair-results.json"), "utf8")),
  };
}

/**
 * @param {string} root
 * @returns {string} exact bytes
 */
export function buildArtefact(root) {
  const { cells, result, pairs } = readCampaign(root);
  const tallyBy = (state) => {
    const out = {};
    for (const c of cells)
      if (c.state === state && c.reason) out[c.reason] = (out[c.reason] ?? 0) + 1;
    return out;
  };
  const discharged = cells
    .filter((c) => c.state === "discharged")
    .map((c) => c.obligation_id)
    .sort();

  const ledger = buildDeltaLedger({
    newlyDischarged: discharged,
    newFindings: 0,
    unprobedByReason: tallyBy("unprobed"),
    notDischargedByReason: tallyBy("probed_not_discharged"),
  });

  const artefact = {
    ...ledger,
    note:
      "Task 23. The delta is what THIS stage discharged, and it is zero. The probe is static; " +
      "clause 10 requires the class-specific outcome matched on this member; a static reading " +
      "cannot demonstrate an outcome that was never executed. The bound was declared in the code " +
      "before the campaign ran, and the campaign met it. Every cell of every attempted pair still " +
      "carries a terminal state, which is what the tranche produced instead of coverage.",
    cells_examined: cells.length,
    cells_by_state: Object.fromEntries(
      [...new Set(cells.map((c) => c.state))]
        .sort()
        .map((s) => [s, cells.filter((c) => c.state === s).length])
    ),
    candidate_findings_raised: cells.filter((c) => c.candidate_finding).length,
    cumulative_view: cumulativeView(discharged.length),
    four_term_disclosure: fourTermDisclosure({
      admissible: result.families_admissible,
      attempted: result.families_attempted,
      newlyDischarged: discharged.length,
    }),
    family_result_census: familyResultCensus(pairs.pairs),
  };
  return `${canonicalJson(artefact)}\n`;
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? join(REPO, DELTA_PATH) : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  if (!existsSync(join(REPO, CAMPAIGN, "campaign-result.json"))) {
    process.stderr.write("delta ledger: the campaign has not run\n");
    return 1;
  }
  const bytes = buildArtefact(REPO);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes, "utf8");
  const a = JSON.parse(bytes);
  process.stdout.write(
    `wrote ${output}\n` +
      `  ${a.four_term_disclosure.families.text}\n` +
      `  ${a.four_term_disclosure.cells.text}\n` +
      `  ${a.cumulative_view.q0_original}  →  ${a.cumulative_view.cumulative_5r}\n` +
      `  census rows: ${a.family_result_census.row_count}\n`
  );
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
