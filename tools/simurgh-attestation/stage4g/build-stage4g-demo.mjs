// SPDX-License-Identifier: AGPL-3.0-or-later
import { buildStage4gDemo } from "./demoCampaign.mjs";

function arg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const outDir = arg(
    argv,
    "--out",
    "docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign"
  );
  const result = await buildStage4gDemo({ outDir });
  if (!result.clean.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
