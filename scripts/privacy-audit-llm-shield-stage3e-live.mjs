// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3E-live privacy audit: scan generated evidence for forbidden raw keys.
// The *_recorded:false / *_enabled:false privacy booleans are explicitly allowed.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "docs/research/llm-shield/evidence/stage-3e-live";
const FORBIDDEN = [
  "anthropic_request_body",
  "anthropic_response_body",
  "provider_request_body",
  "provider_response_body",
  "raw_provider_output",
  "raw_input",
  "raw_context",
  "api_key",
  "anthropic_api_key",
  "authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
  "system_prompt",
  "developer_prompt",
  "tool_args",
];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".json")) out.push(p);
  }
  return out;
}

let failed = false;
for (const f of await walk(ROOT)) {
  const txt = await readFile(f, "utf8");
  for (const k of FORBIDDEN) {
    if (txt.includes(`"${k}"`) && !txt.includes(`"${k}":false`) && !txt.includes(`"${k}": false`)) {
      console.error(`FAIL: forbidden key ${k} in ${f}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("PASS: stage 3E-live privacy audit");
