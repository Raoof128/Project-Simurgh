// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3O consistency audit: recompute deterministic evidence from the frozen
// corpus + reference targets and assert the committed artifacts match.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildEvidence } from "../tools/simurgh-benchmark/simurgh-benchmark.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3o";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const { artifacts } = await buildEvidence();
for (const [name, value] of Object.entries(artifacts)) {
  const committed = JSON.parse(await readFile(join(ROOT, name), "utf8"));
  if (stable(committed) !== stable(value)) {
    console.error(`stage3o consistency FAIL: ${name} drifted from recomputation`);
    process.exit(1);
  }
}
console.log("stage3o consistency audit: passed");
