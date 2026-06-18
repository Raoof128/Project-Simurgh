// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3G privacy audit. Generated live-shadow evidence must stay metadata-only.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeStage3gEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3g_live_shadow_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3g";
let failures = 0;
const fail = (message) => {
  console.error(`[FAIL] ${message}`);
  failures++;
};
const ok = (message) => console.log(`[PASS] ${message}`);

async function collectGenerated() {
  const files = [];
  for (const file of ["metrics.json", "live-shadow-manifest.json", "provider-output-hashes.json"]) {
    files.push([file, await readFile(join(ROOT, file), "utf8")]);
  }
  for (const dir of ["receipt-samples", "audit-samples", "generated"]) {
    for (const file of await readdir(join(ROOT, dir))) {
      if (file.endsWith(".json"))
        files.push([`${dir}/${file}`, await readFile(join(ROOT, dir, file), "utf8")]);
    }
  }
  return files;
}

const findings = computeStage3gEvidenceLeakageFindings(await collectGenerated());
for (const finding of findings) fail(`${finding.file} contains forbidden token ${finding.token}`);
if (findings.length === 0) ok("stage3g generated evidence is metadata-only");

const metrics = JSON.parse(await readFile(join(ROOT, "metrics.json"), "utf8"));
if (metrics.raw_transcript_stored_count !== 0) fail("raw transcript count is non-zero");
if (metrics.provider_output_hash_coverage_rate !== 1)
  fail("provider output hash coverage is incomplete");
if (metrics.live_provider_mode.includes("no_raw_transcripts")) {
  ok("metrics preserve no-raw-transcript live shadow mode");
} else {
  fail("metrics do not attest no-raw-transcript mode");
}

console.log("");
console.log(
  `privacy-audit-llm-shield-stage3g: ${failures === 0 ? "passed" : failures + " failed"}`
);
process.exit(failures === 0 ? 0 : 1);
