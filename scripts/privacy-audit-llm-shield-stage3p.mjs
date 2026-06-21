// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3P privacy audit: every committed evidence file is metadata-only and
// carries no forbidden tokens; the self-proof block declares it does not pollute
// the clean catalogue.
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tools/simurgh-benchmark/crossDefenceLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";

async function walk(dir) {
  const out = [];
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) out.push(p);
  }
  return out;
}

const files = await walk(EV);
const pairs = [];
for (const f of files) pairs.push([f, await readFile(f, "utf8")]);
const findings = computeEvidenceLeakageFindings(pairs);
if (findings.length > 0) {
  console.error("stage3p privacy: FAIL", JSON.stringify(findings));
  process.exit(1);
}
const sp = JSON.parse(await readFile(join(EV, "self-proof", "self-proof-results.json"), "utf8"));
if (sp.pollutes_clean_catalogue !== false) {
  console.error("stage3p privacy: FAIL — self-proof must not pollute the clean catalogue");
  process.exit(1);
}
console.log("stage3p privacy: PASS");
