// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";

const EV = process.env.SIMURGH_STAGE3I_EVIDENCE_DIR || "docs/research/llm-shield/evidence/stage-3i";
const FORBIDDEN = [
  "raw_prompt",
  "raw_provider_output",
  "raw_tool_output",
  "raw_task",
  "system_prompt",
  "developer_message",
  "transcript",
  "trajectory",
  "api_key",
  "token",
];
const fail = (m) => {
  console.error(`stage3i privacy FAIL: ${m}`);
  process.exit(1);
};

for (const name of ["error-taxonomy.json", "benign-recovery-analysis.json"]) {
  const text = await readFile(`${EV}/${name}`, "utf8");
  const lower = text.toLowerCase();
  for (const key of FORBIDDEN) {
    if (lower.includes(`"${key}"`)) fail(`${name} contains forbidden key ${key}`);
  }
  // raw AgentDojo identifiers must never appear, in any field or value
  if (/user_task_\d+/i.test(text)) fail(`${name} contains raw user_task id`);
  if (/injection_task_\d+/i.test(text)) fail(`${name} contains raw injection_task id`);
  const doc = JSON.parse(text);
  if (name === "error-taxonomy.json") {
    for (const entry of doc.entries) {
      for (const hk of ["case_hash", "task_id_hash", "receipt_hash"]) {
        if (typeof entry[hk] !== "string" || entry[hk].length !== 64)
          fail(`${hk} must be a 64-char sha256`);
      }
      if ("case_id" in entry) fail("error-taxonomy must not carry raw case_id");
      if ("task_id" in entry) fail("error-taxonomy must not carry raw task_id");
      if ("security_case_id" in entry) fail("error-taxonomy must not carry raw security_case_id");
    }
  }
}
console.log("stage3i privacy OK");
