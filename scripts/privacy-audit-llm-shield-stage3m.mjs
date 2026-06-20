// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3M privacy audit: attestation evidence must be metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanLeakage } from "../tools/simurgh-attestation/attestationLib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3m";
const entries = (await readdir(ROOT)).filter((f) => f.endsWith(".json") || f.endsWith(".txt"));
const files = [];
for (const name of entries) files.push([name, await readFile(join(ROOT, name), "utf8")]);

const findings = scanLeakage(files);
// Forbidden literals: PRIVATE key blocks (not the legitimate committed PUBLIC key),
// env files, and incident-transcript markers.
const PRIVATE_KEY_BLOCK = /-----BEGIN ([A-Z]+ )?PRIVATE KEY-----/;
const FORBIDDEN = [".env", "Pliny", "REDACTED-SYNTHETIC"];
for (const [name, content] of files) {
  if (PRIVATE_KEY_BLOCK.test(content)) findings.push({ file: name, token: "private-key-block" });
  for (const token of FORBIDDEN) if (content.includes(token)) findings.push({ file: name, token });
}
if (findings.length > 0) {
  console.error("stage3m privacy audit FAIL:", JSON.stringify(findings, null, 2));
  process.exit(1);
}
console.log("stage3m privacy audit: passed");
