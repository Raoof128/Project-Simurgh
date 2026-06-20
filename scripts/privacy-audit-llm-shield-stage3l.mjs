// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3L privacy audit: generated evidence must be metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3l";
const entries = (await readdir(ROOT)).filter((f) => f.endsWith(".json") || f.endsWith(".txt"));
const files = [];
for (const name of entries) files.push([name, await readFile(join(ROOT, name), "utf8")]);

const findings = computeEvidenceLeakageFindings(files);
// Reviewer-named forbidden literals that must never appear in evidence.
const EXTRA = [".env", "BEGIN PRIVATE KEY", "BEGIN JAILBREAK", "Pliny", "REDACTED-SYNTHETIC"];
for (const [name, content] of files) {
  for (const token of EXTRA) {
    if (content.includes(token)) findings.push({ file: name, token });
  }
}
if (findings.length > 0) {
  console.error("stage3l privacy audit FAIL:", JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("stage3l privacy audit: passed");
