// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3Q privacy: every committed evidence file is metadata-only / no forbidden
// tokens; self-proof declares it does not pollute the real registry/diffs.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const FORBIDDEN = ["Pliny", "raw_transcript", "raw_target_output", "BEGIN PRIVATE KEY"];

async function walk(dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) out.push(p);
  }
  return out;
}

const findings = [];
for (const f of await walk(EV)) {
  const c = await readFile(f, "utf8");
  for (const tok of FORBIDDEN) if (c.includes(tok)) findings.push({ file: f, token: tok });
}
if (findings.length > 0) {
  console.error("stage3q privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
const sp = JSON.parse(await readFile(join(EV, "self-proof", "self-proof-results.json"), "utf8"));
if (sp.pollutes_real_registry !== false || sp.pollutes_real_diffs !== false) {
  console.error("stage3q privacy: FAIL — self-proof must not pollute real registry/diffs");
  process.exit(1);
}
console.log("stage3q privacy: PASS");
