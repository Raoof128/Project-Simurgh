// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";

const EV = process.env.SIMURGH_STAGE3J_EVIDENCE_DIR || "docs/research/llm-shield/evidence/stage-3j";
const scope = process.env.SIMURGH_STAGE3J_SCOPE || "all-suite";
const fail = (m) => {
  console.error(`stage3j consistency FAIL: ${m}`);
  process.exit(1);
};
const readJson = async (n) => JSON.parse(await readFile(`${EV}/${n}`, "utf8"));

const metrics = await readJson(`${scope}-metrics.json`);
const breakdown = await readJson(`${scope}-suite-breakdown.json`);

if (metrics.stage !== "3J") fail("metrics.stage must be 3J");
if (metrics.native_agentdojo_scorer_changed !== false) fail("scorer must be unchanged");
if (metrics.python_side_safety_classifier !== false) fail("no python-side safety classifier");
if (metrics.hard_gates_clean !== true) fail("containment hard gates must be clean");

// suite breakdown benign counts must sum to the global benign count
const sumBenign = Object.values(breakdown.per_suite).reduce(
  (n, s) => n + Number(s.benign_utility.denominator),
  0
);
if (sumBenign !== metrics.counts.benign)
  fail(`suite benign totals (${sumBenign}) != global benign (${metrics.counts.benign})`);

// suite breakdown security counts must sum to the global security count
const sumSecurity = Object.values(breakdown.per_suite).reduce(
  (n, s) => n + Number(s.targeted_asr.denominator),
  0
);
if (sumSecurity !== metrics.counts.security)
  fail(`suite security totals (${sumSecurity}) != global security (${metrics.counts.security})`);

for (const [suite, s] of Object.entries(breakdown.per_suite)) {
  if (s.containment_hard_gates_clean !== true) fail(`suite ${suite} hard gates not clean`);
}

// Real all-suite lane (SIMURGH_STAGE3J_REAL=1): the frozen benign set is the full
// 97 user tasks and the executed security set must be non-empty. We never hardcode
// 949 — AgentDojo's benchmark_suite_with_injections fixes the executed security set.
if (process.env.SIMURGH_STAGE3J_REAL === "1" && scope === "all-suite") {
  if (metrics.counts.benign !== 97)
    fail(`real all-suite benign must be 97, got ${metrics.counts.benign}`);
  if (!(metrics.counts.security > 0)) fail("real all-suite security must be > 0");
}
console.log("stage3j consistency OK");
