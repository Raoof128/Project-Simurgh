// SPDX-License-Identifier: AGPL-3.0-or-later
// Offline Stage 4N verifier CLI. Fail-closed and total: never throws; every path exits
// through stage4CodeForRawCode. No network, no clock — as_of_window is an explicit input
// committed into the report (Fix 3).
import { readFile, writeFile } from "node:fs/promises";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";
import { seismographVerdict } from "../core/verdictCore.mjs";
import { computeSourceRoots } from "./sourceRoots.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const outPath = arg("--out");

async function main() {
  const feedPath = arg("--feed");
  const policyPath = arg("--policy");
  const asOfWindow = arg("--as-of");
  const repoRoot = arg("--repo-root") ?? process.cwd();
  if (!feedPath || !policyPath || !asOfWindow || !outPath) {
    return { rawCode: 29, reason: "usage_invalid", gate: null, as_of_window: asOfWindow ?? null };
  }
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const records = (await readFile(feedPath, "utf8"))
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
  const { disclosure_leaves, ...sourceRoots } = await computeSourceRoots(repoRoot);
  void disclosure_leaves;
  const inclusionProofPath = arg("--inclusion-proof");
  const secondArtifactPath = arg("--second-artifact");
  return seismographVerdict({
    policy,
    records,
    asOfWindow,
    sourceRoots,
    publicArtifacts: [
      { name: "heartbeat-feed.jsonl", value: records },
      { name: "genesis-policy.json", value: policy },
    ],
    inclusionProof: inclusionProofPath
      ? JSON.parse(await readFile(inclusionProofPath, "utf8"))
      : null,
    secondArtifact: secondArtifactPath
      ? JSON.parse(await readFile(secondArtifactPath, "utf8"))
      : null,
  });
}

let verdict;
try {
  verdict = await main();
} catch {
  verdict = { rawCode: 29, reason: "internal_error_fail_closed", gate: null, as_of_window: null };
}
const report = {
  schema: "simurgh.seismograph.verdict.v1",
  rawCode: verdict.rawCode,
  runLevel: stage4CodeForRawCode(verdict.rawCode),
  reason: verdict.reason,
  gate: verdict.gate,
  as_of_window: verdict.as_of_window,
};
try {
  if (outPath) await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
} catch {
  report.rawCode = 29;
}
process.exit(stage4CodeForRawCode(report.rawCode));
