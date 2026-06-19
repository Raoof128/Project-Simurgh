// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from "node:fs/promises";
const EV = "docs/research/llm-shield/evidence/stage-3h";
// Key-form matches ("key":) — a forbidden FIELD carrying raw content, not a
// legitimate schema enum value (e.g. "source_type": "tool_result" is allowed).
const FORBIDDEN = [
  /"api_key"\s*:/i,
  /"anthropic_api_key"\s*:/i,
  /"provider_request_body"\s*:/i,
  /"provider_response_body"\s*:/i,
  /"raw_provider_output"\s*:/i,
  /"system_prompt"\s*:/i,
  /"transcript"\s*:/i,
  /"tool_result"\s*:/i,
  /sk-ant-[a-z0-9-]+/i,
];
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir)) {
    const p = `${dir}/${e}`;
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith(".json")) out.push(p);
  }
  return out;
}
let bad = 0;
for (const f of await walk(EV)) {
  const txt = await readFile(f, "utf8");
  for (const re of FORBIDDEN)
    if (re.test(txt)) {
      console.error(`LEAK ${f}: ${re}`);
      bad++;
    }
}
if (bad) {
  console.error(`stage3h privacy audit FAILED (${bad})`);
  process.exit(1);
}
console.log("stage3h privacy audit: passed (metadata-only)");
