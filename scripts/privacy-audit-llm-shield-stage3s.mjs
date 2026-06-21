// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
const EV = "docs/research/llm-shield/evidence/stage-3s";
// Detect RAW leaked data, never the safe privacy boolean field NAMES (the digest
// legitimately contains typed_content_captured:false, raw_window_titles_captured:false).
const FORBIDDEN = ["BEGIN PRIVATE KEY", "raw_transcript", "raw_provider_output", "raw_typed_content", "raw_window_title_value", "process_name:", "window_title:"];
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
}
const digest = JSON.parse(await readFile(join(EV, "digest", "evidence-digest.json"), "utf8"));
if (digest.privacy.raw_pixels_captured || digest.privacy.raw_window_titles_captured || digest.privacy.typed_content_captured)
  findings.push({ f: "evidence-digest.json", t: "privacy_overclaim" });
if (findings.length) {
  console.error("stage3s privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
console.log("stage3s privacy: PASS");
