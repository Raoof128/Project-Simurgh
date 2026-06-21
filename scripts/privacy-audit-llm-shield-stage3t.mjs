// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const FORBIDDEN = [
  "BEGIN PRIVATE KEY",
  "raw_prompt",
  "raw_output",
  "raw_transcript",
  "ip_address",
  "api_key",
  "chain_of_thought_text",
];
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) o.push(p);
  }
  return o;
}
const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const t of FORBIDDEN) if (c.includes(t)) findings.push({ f, t });
  if (EMAIL_RE.test(c)) findings.push({ f, t: "email_like_value" });
}
const set = JSON.parse(await readFile(join(EV, "meta-set", "metadata-set.json"), "utf8"));
if (
  set.set_provenance !== "synthetic_reference" ||
  set.live_traffic_used !== false ||
  set.identity_data_used !== false ||
  set.raw_content_used !== false
)
  findings.push({ f: "metadata-set.json", t: "provenance_not_synthetic_offline" });
if (findings.length) {
  console.error("stage3t privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
console.log("stage3t privacy: PASS");
