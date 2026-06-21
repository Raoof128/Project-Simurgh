// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { runExtractionSelfProof } from "../tools/simurgh-extraction/selfProof.mjs";
import { FORBIDDEN_WORDING, SACRED_NON_CLAIM } from "../tools/simurgh-extraction/renderer.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const errors = [];
const sp = runExtractionSelfProof();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.intent_claims_rendered !== 0) errors.push("intent claim rendered");
async function walk(d) {
  const o = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) o.push(...(await walk(p)));
    else if ((await stat(p)).isFile()) o.push(p);
  }
  return o;
}
for (const f of await walk(EV)) {
  const lower = (await readFile(f, "utf8")).toLowerCase();
  for (const w of FORBIDDEN_WORDING)
    if (lower.includes(w)) errors.push(`forbidden/named-lab wording in ${f}: ${w}`);
}
const att = JSON.parse(await readFile(join(EV, "result", "attestation.json"), "utf8"));
if (!att.rendered_summary.includes(SACRED_NON_CLAIM))
  errors.push("sacred non-claim missing from attestation");
if (att.intent_claim_made !== false) errors.push("attestation made an intent claim");
if (errors.length) {
  console.error("stage3t security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3t security: PASS");
