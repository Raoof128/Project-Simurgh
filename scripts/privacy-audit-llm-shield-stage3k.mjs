// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir } from "node:fs/promises";

const EV = process.env.SIMURGH_STAGE3K_EVIDENCE_DIR || "docs/research/llm-shield/evidence/stage-3k";
const FORBIDDEN = [
  "raw_prompt",
  "raw_provider_output",
  "raw_tool_output",
  "raw_mutation_text",
  "mutated_prompt",
  "system_prompt",
  "developer_message",
  "transcript",
  "trajectory",
  "tool_result",
  "api_key",
  "token",
];
const fail = (m) => {
  console.error(`stage3k privacy FAIL: ${m}`);
  process.exit(1);
};

const files = (await readdir(EV)).filter((f) => f.endsWith(".json"));
if (files.length === 0) fail("no evidence json found");
for (const name of files) {
  const text = await readFile(`${EV}/${name}`, "utf8");
  const lower = text.toLowerCase();
  for (const key of FORBIDDEN) {
    if (lower.includes(`"${key}"`)) fail(`${name} contains forbidden key ${key}`);
  }
  if (/user_task_\d+/i.test(text)) fail(`${name} contains raw user_task id`);
  if (/injection_task_\d+/i.test(text)) fail(`${name} contains raw injection_task id`);
}
console.log("stage3k privacy OK");
