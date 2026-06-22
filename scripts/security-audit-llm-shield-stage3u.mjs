// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { runExtractionSelfProofV2 } from "../tools/simurgh-extraction/selfProofV2.mjs";
import { FORBIDDEN_WORDING, SACRED_NON_CLAIM } from "../tools/simurgh-extraction/rendererV2.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const errors = [];
const sp = runExtractionSelfProofV2();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.intent_claims_rendered !== 0) errors.push("intent claim rendered");
if (sp.summary.single_strong_plus_volume_escalations !== 0)
  errors.push("A10 regression: volume corroborated");
async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) o.push(p);
  }
  return o;
}
const NAMED_LABS = ["deepseek", "moonshot", "minimax"];
for (const f of await walk(EV)) {
  const lower = (await readFile(f, "utf8")).toLowerCase();
  for (const lab of NAMED_LABS)
    if (lower.includes(lab)) errors.push(`named lab in evidence ${f}: ${lab}`);
  if (f.endsWith(".json"))
    for (const w of FORBIDDEN_WORDING)
      if (lower.includes(w)) errors.push(`forbidden wording in ${f}: ${w}`);
}
const att = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
if (!att.rendered_summary.includes(SACRED_NON_CLAIM)) errors.push("sacred non-claim missing");
if (att.intent_claim_made !== false) errors.push("attestation made an intent claim");
if (errors.length) {
  console.error("stage3u security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3u security: PASS");
