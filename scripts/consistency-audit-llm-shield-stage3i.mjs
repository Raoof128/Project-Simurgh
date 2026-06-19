// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";

const EV = process.env.SIMURGH_STAGE3I_EVIDENCE_DIR || "docs/research/llm-shield/evidence/stage-3i";
const fail = (m) => {
  console.error(`stage3i consistency FAIL: ${m}`);
  process.exit(1);
};
const readJson = async (n) => JSON.parse(await readFile(`${EV}/${n}`, "utf8"));

const taxonomy = await readJson("error-taxonomy.json");
const analysis = await readJson("benign-recovery-analysis.json");

// Closeout coverage: the frozen 3H-L2 sample is 10 benign + 20 security.
// (Set SIMURGH_STAGE3I_STRICT=0 to relax for a smaller dev fixture.)
const strict = process.env.SIMURGH_STAGE3I_STRICT !== "0";
const benignEntries = taxonomy.entries.filter((e) => e.kind === "benign");
const securityEntries = taxonomy.entries.filter((e) => e.kind === "security");
if (strict) {
  // The frozen sample always has 10 benign rows, but the taxonomy lists only
  // benign FAILURES and BLOCKED security cases — so it shrinks to zero when
  // utility is recovered. Validate faithful reflection, not a fixed failure count.
  if (analysis.benign_total !== 10) fail("expected 10 benign rows in the sample");
  if (benignEntries.length !== analysis.benign_failures)
    fail("benign-failure taxonomy entries must equal analysis.benign_failures");
  if (benignEntries.some((e) => e.utility_result !== "fail"))
    fail("benign taxonomy entries must all be failures");
  // Security entries exist only for blocked cases; each must name a Simurgh
  // boundary, never a model/scorer/adapter non-block.
  const nonBlock = new Set(["model", "scorer", "adapter"]);
  if (securityEntries.some((e) => nonBlock.has(e.boundary)))
    fail("security taxonomy entries must all be Simurgh blocks");
}

// Every benign failure listed in the analysis must appear in the taxonomy.
const taxonomyBenignFailures = benignEntries.filter((e) => e.utility_result === "fail").length;
if (taxonomyBenignFailures < analysis.benign_failures)
  fail("analysis reports more benign failures than the taxonomy lists");

const summed = Object.values(analysis.failure_class_counts).reduce((a, b) => a + b, 0);
if (summed !== analysis.benign_failures) fail("failure_class_counts do not sum to benign_failures");

if (analysis.over_defence.count > analysis.benign_failures)
  fail("over_defence count exceeds benign failures");

const tool = ["tool_family_not_permitted", "argument_shape_reject", "effect_reject"];
const expectGate = tool.includes(analysis.dominant_failure_class)
  ? "proceed_tool_permit_stack"
  : "rescope_context_guard_adapter";
if (analysis.decision_gate !== expectGate)
  fail(`decision_gate ${analysis.decision_gate} disagrees with dominant class`);

for (const entry of taxonomy.entries) {
  if (entry.audit_chain_valid !== true) fail(`entry ${entry.case_ref} audit invalid`);
}
console.log("stage3i consistency OK");
