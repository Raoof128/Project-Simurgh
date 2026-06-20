// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3N privacy audit: generated evidence must be metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3n";
const entries = (await readdir(ROOT)).filter((f) => f.endsWith(".json") || f.endsWith(".txt"));
const files = [];
for (const name of entries) files.push([name, await readFile(join(ROOT, name), "utf8")]);

const findings = computeEvidenceLeakageFindings(files);
const PRIVATE_KEY_BLOCK = /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/;
for (const [name, content] of files) {
  if (PRIVATE_KEY_BLOCK.test(content)) findings.push({ file: name, token: "private-key-block" });
}
if (findings.length > 0) {
  console.error("stage3n privacy audit FAIL:", JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("stage3n privacy audit: passed");
