// SPDX-License-Identifier: AGPL-3.0-or-later
import { access, readFile } from "node:fs/promises";

const EV = process.env.SIMURGH_STAGE3K_EVIDENCE_DIR || "docs/research/llm-shield/evidence/stage-3k";
const fail = (m) => {
  console.error(`stage3k consistency FAIL: ${m}`);
  process.exit(1);
};
const readJson = async (n) => JSON.parse(await readFile(`${EV}/${n}`, "utf8"));
const exists = async (n) =>
  access(`${EV}/${n}`).then(
    () => true,
    () => false
  );
const sum = (obj) => Object.values(obj).reduce((n, v) => n + Number(v), 0);

// catalogue mode: always verify the run-independent catalogues
const ops = await readJson("mutation-operators.json");
if (ops.operators.length !== 10) fail(`expected 10 operators, got ${ops.operators.length}`);
const cats = await readJson("action-open-categories.json");
if (cats.categories.length !== 5) fail(`expected 5 categories, got ${cats.categories.length}`);

// full mode: only when the real run has frozen data-bearing evidence
if (!(await exists("metrics.json"))) {
  console.log("stage3k consistency OK (catalogue mode)");
  process.exit(0);
}

const metrics = await readJson("metrics.json");
const mutation = await readJson("mutation-manifest.json");
const actionOpen = await readJson("action-open-manifest.json");
const operatorBreakdown = await readJson("operator-breakdown.json");
const suiteBreakdown = await readJson("suite-breakdown.json");
const sourceMap = await readJson("source-case-map.json");

if (metrics.stage !== "3K") fail("metrics.stage must be 3K");
if (metrics.native_agentdojo_scorer_changed !== false) fail("scorer must be unchanged");
if (metrics.python_side_safety_classifier !== false) fail("no python-side safety classifier");
if (metrics.metrics_consistent !== true) fail("metrics_consistent must be true");

// mutation manifest count == metrics count
if (mutation.mutation_variant_count !== metrics.mutation_variant_count)
  fail("mutation manifest count != metrics mutation_variant_count");

// every mutation has a source case hash (64-char hex)
for (const e of mutation.entries) {
  if (!/^[0-9a-f]{64}$/.test(e.source_case_hash || ""))
    fail("mutation entry missing source_case_hash");
}

// source-case-map counts sum to the mutation variant count
if (sum(sourceMap.entries) !== mutation.mutation_variant_count)
  fail("source-case-map sum != mutation count");

// operator breakdown sums to global mutation count
if (sum(Object.fromEntries(Object.entries(operatorBreakdown.per_operator).map(([k, o]) => [k, o.variant_count]))) !==
  metrics.mutation_variant_count)
  fail("operator breakdown sum != mutation count");

// Fix 2: action-open lane accounting must be as strict as the mutation lane
if (actionOpen.action_open_case_count !== metrics.action_open_case_count)
  fail("action-open manifest count != metrics action_open_case_count");
if (sum(actionOpen.per_suite) !== actionOpen.action_open_case_count)
  fail("action-open per_suite sum != action_open_case_count");
if (sum(actionOpen.per_category) !== actionOpen.action_open_case_count)
  fail("action-open per_category sum != action_open_case_count");

// suite breakdown present + tagged 3K
if (suiteBreakdown.stage !== "3K") fail("suite-breakdown.stage must be 3K");

// MUTUAL EXCLUSION: any operator_asr_delta > 0 cannot coexist with clean hard gates
const anyDelta = Object.values(metrics.operator_asr_delta).some((v) => Number(v) > 0);
if (anyDelta && metrics.containment_hard_gates_clean === true)
  fail("operator_asr_delta>0 cannot coexist with clean containment hard gates");

console.log("stage3k consistency OK (full mode)");
