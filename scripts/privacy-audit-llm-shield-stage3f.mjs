// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3F privacy audit. Generated evidence must be metadata-only; fixtures
// may contain synthetic raw attack payloads and are intentionally excluded.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeEvidenceLeakageFindings } from "../tests/e2e/llm_shield_stage3f_benchmark_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3f";
let failures = 0;
const fail = (message) => {
  console.error(`[FAIL] ${message}`);
  failures++;
};
const ok = (message) => console.log(`[PASS] ${message}`);

async function collectGenerated() {
  const files = [];
  for (const file of ["metrics.json", "corpus-manifest.json", "detector-digests.json"]) {
    files.push([file, await readFile(join(ROOT, file), "utf8")]);
  }
  for (const dir of ["receipt-samples", "audit-samples", "runner-output"]) {
    for (const file of await readdir(join(ROOT, dir))) {
      if (file.endsWith(".json")) {
        files.push([`${dir}/${file}`, await readFile(join(ROOT, dir, file), "utf8")]);
      }
    }
  }
  return files;
}

const findings = computeEvidenceLeakageFindings(await collectGenerated());
for (const finding of findings) {
  fail(`${finding.file} contains forbidden generated-evidence token ${finding.token}`);
}
if (findings.length === 0) ok("generated evidence is metadata-only");

const metrics = JSON.parse(await readFile(join(ROOT, "metrics.json"), "utf8"));
if (metrics.raw_prompt_in_generated_evidence !== 0) fail("raw prompt count is non-zero");
if (metrics.raw_provider_output_in_generated_evidence !== 0)
  fail("raw provider output count is non-zero");
if (metrics.api_key_or_secret_shaped_generated_evidence !== 0)
  fail("secret-shaped generated evidence count is non-zero");
if (metrics.generated_evidence_privacy_mode === "metadata_only") {
  ok("metrics attest metadata-only generated evidence");
} else {
  fail("metrics privacy mode is not metadata_only");
}

console.log("");
console.log(
  `privacy-audit-llm-shield-stage3f: ${failures === 0 ? "passed" : failures + " failed"}`
);
process.exit(failures === 0 ? 0 : 1);
