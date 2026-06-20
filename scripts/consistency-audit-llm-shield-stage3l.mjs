// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3L consistency audit: re-derive metrics from the corpus and assert the
// committed evidence matches, with H1 + direct-input validity + hard gates.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildStage3lCorpus,
  evaluateStage3lCase,
  computeStage3lMetrics,
  enforceStage3lHardGates,
  enforceInputMissValidity,
  enforceDirectInputValidity,
} from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3l";
const evaluations = buildStage3lCorpus().map((fixture) => ({
  fixture,
  result: evaluateStage3lCase(fixture),
}));

for (const [label, check] of [
  ["H1 input-miss", enforceInputMissValidity(evaluations)],
  ["direct-input", enforceDirectInputValidity(evaluations)],
]) {
  if (!check.ok) {
    console.error(`stage3l consistency FAIL (${label}):\n${check.errors.join("\n")}`);
    process.exit(1);
  }
}

const metrics = computeStage3lMetrics(evaluations);
const gate = enforceStage3lHardGates(metrics);
if (!gate.ok) {
  console.error(`stage3l consistency FAIL (gates):\n${gate.errors.join("\n")}`);
  process.exit(1);
}

const committed = JSON.parse(await readFile(join(ROOT, "metrics.json"), "utf8"));
if (JSON.stringify(committed) !== JSON.stringify(metrics)) {
  console.error("stage3l consistency FAIL: committed metrics.json != recomputed metrics");
  process.exit(1);
}
console.log("stage3l consistency audit: passed");
