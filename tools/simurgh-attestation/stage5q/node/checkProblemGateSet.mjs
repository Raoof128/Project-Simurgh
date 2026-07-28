#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Q1-F002 — compute the census problem set and compare it against the committed pin.
//
//   node tools/simurgh-attestation/stage5q/node/checkProblemGateSet.mjs
//
// Gate 8 of the 5Q reproduce script used to compare a headcount. It compares identities now: the
// set is the authority, the count is telemetry, and `added` / `removed` are printed independently
// so a repaired problem is never mistaken for the absence of a new one.
//
// The step scan is duplicated from `measureGateCensus.mjs` deliberately rather than imported: that
// module's `main` prints a truncated list (eight of nineteen), and a checker that consumed its
// stdout would be pinning whatever the printer chose to show.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { gateCensus } from "../core/censusGate.mjs";
import { classifyReason, compareProblemSets } from "../core/problemGateSet.mjs";

const REPO = process.cwd();
const PIN_PATH = "docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json";

/** Committed universe queries — kept identical to `measureGateCensus.mjs`. */
const UNIVERSE_QUERIES = Object.freeze({
  "stage-4-lean-proofs.yml": { query: "find proofs -name '*.lean'" },
});

function workflowSteps() {
  const dir = join(REPO, ".github/workflows");
  if (!existsSync(dir)) return [];
  const steps = [];
  for (const file of readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .sort()) {
    const text = readFileSync(join(dir, file), "utf8");
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

/** The live problem set, as {gate_id, reason_code} pairs, deterministically ordered. */
export function computeProblemSet() {
  return (
    gateCensus({ steps: workflowSteps() })
      .problems.map((p) => ({ gate_id: p.gate_id, reason_code: classifyReason(p.reason) }))
      // Plain code-unit ordering, matching the sortedness check in `compareProblemSets`. NOT
      // localeCompare: it disagrees with default sort on `::` and `-`, which is locale-dependent
      // besides — the first pin generated this way was refused as unsorted by its own checker.
      .sort((a, b) => {
        const [x, y] = [`${a.gate_id} ${a.reason_code}`, `${b.gate_id} ${b.reason_code}`];
        return x < y ? -1 : x > y ? 1 : 0;
      })
  );
}

export function readPinnedSet() {
  return JSON.parse(readFileSync(PIN_PATH, "utf8"));
}

function main() {
  const actual = computeProblemSet();
  const pin = readPinnedSet();
  const result = compareProblemSets({ pinned: pin.gate_problems, actual });

  if (result.refusal) {
    console.log(`FAIL: the pinned problem set is unusable — ${result.refusal}`);
    return 1;
  }
  if (!result.ok) {
    console.log("FAIL: the repository's gate landscape moved. Re-review, then re-pin BY SET.");
    for (const e of result.added) console.log(`  ADDED   ${e.gate_id}  [${e.reason_code}]`);
    for (const e of result.removed) console.log(`  REMOVED ${e.gate_id}  [${e.reason_code}]`);
    console.log(
      `  counts: pinned ${result.pinned_count}, computed ${result.actual_count} — the counts are ` +
        `telemetry; the identities above are the finding.`
    );
    return 1;
  }

  // The count is checked last and only as a sanity reading on the pin file's own declaration.
  if (pin.entry_count !== result.pinned_count) {
    console.log(
      `FAIL: the pin declares entry_count ${pin.entry_count} but carries ${result.pinned_count} entries`
    );
    return 1;
  }

  console.log(
    `gate census: ${result.actual_count} problem gate(s), set-identical to the pin ` +
      `(baseline ${pin.baseline_tag}): OK`
  );
  return 0;
}

// `process.argv[1]` is undefined under `node --input-type=module -e`, and pathToFileURL throws on
// undefined — so an importer would crash on the guard meant to protect it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
