// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — Lane B blind recompute child (plan Task 12). Re-derives ASR + partition + floor
// from a pinned findings file ALONE, with no operator hints. Exits 2 if any leakage channel is
// present (OPERATOR_* env, or a committed-total / expected-raw / evidence hint). The parent runs
// it with cwd in a sterile temp dir. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { tallies, computeAsr, floorReconcile } from "../core/asrCore.mjs";

// Fail closed on any operator leakage channel.
for (const k of Object.keys(process.env)) if (k.startsWith("OPERATOR_")) process.exit(2);
const FORBIDDEN = ["committed_asr", "expected_raw", "committed_aggregates", "evidence/"];
for (const arg of process.argv.slice(2))
  if (FORBIDDEN.some((f) => arg.includes(f))) process.exit(2);

const findingsPath = process.argv[2];
if (!findingsPath) process.exit(2);
const { findings, floors } = JSON.parse(readFileSync(findingsPath, "utf8"));
const out = {
  asr: computeAsr(findings),
  aggregates: tallies(findings),
  reconciliation: floorReconcile(findings, floors || {}),
};
process.stdout.write(canonicalJson(out));
