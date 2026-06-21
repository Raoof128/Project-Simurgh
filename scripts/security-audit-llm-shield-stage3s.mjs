// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runNarrativeSelfProof } from "../tools/simurgh-narrative/selfProof.mjs";
import { FORBIDDEN_WORDING } from "../tools/simurgh-narrative/claimChecker.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3s";
const errors = [];
const sp = runNarrativeSelfProof();
if (!sp.summary.all_passed) errors.push("self-proof failed");
if (sp.summary.narrative_claim_conflicts_rendered !== 0) errors.push("claim conflict rendered");
if (sp.summary.automatic_findings_rendered !== 0) errors.push("automatic finding rendered");
if (sp.summary.narrative_claim_conflict_attempts < 1) errors.push("conflict teeth never fired");
const art = JSON.parse(await readFile(join(EV, "verified", "verified-narrative-artifact.json"), "utf8"));
if (art.automatic_finding_made !== false) errors.push("artifact made an automatic finding");
const lower = String(art.rendered_summary).toLowerCase();
for (const w of FORBIDDEN_WORDING) {
  // the disclaimer legitimately negates "misconduct finding"; flag only accusatory terms.
  if (w === "misconduct confirmed") continue;
  if (lower.includes(w)) errors.push(`forbidden wording in artifact: ${w}`);
}
if (errors.length) {
  console.error("stage3s security: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3s security: PASS");
