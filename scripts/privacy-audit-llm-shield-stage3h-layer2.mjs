// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from "node:fs/promises";

const EV = "docs/research/llm-shield/evidence/stage-3h-layer2";
const FORBIDDEN = [
  /"api_key"\s*:/i,
  /"anthropic_api_key"\s*:/i,
  /"provider_request_body"\s*:/i,
  /"provider_response_body"\s*:/i,
  /"raw_provider_output"\s*:/i,
  /"raw_prompt"\s*:/i,
  /"raw_tool_output"\s*:/i,
  /"system_prompt"\s*:/i,
  /"transcript"\s*:/i,
  /"trajectory"\s*:/i,
  /"tool_result"\s*:/i,
  /sk-ant-[a-z0-9-]+/i,
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const path = `${dir}/${entry}`;
    if ((await stat(path)).isDirectory()) out.push(...(await walk(path)));
    else if (path.endsWith(".json") || path.endsWith(".md")) out.push(path);
  }
  return out;
}

let bad = 0;
for (const file of await walk(EV)) {
  const text = await readFile(file, "utf8");
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      console.error(`LEAK ${file}: ${re}`);
      bad++;
    }
  }
}
if (bad) {
  console.error(`stage3h-layer2 privacy audit FAILED (${bad})`);
  process.exit(1);
}
console.log("stage3h-layer2 privacy audit: passed (metadata-only)");
