// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — Lane B blind ceremony (plan Task 12). Spawns the recompute child in a STERILE
// temp dir containing ONLY the minimal pinned findings file — no repo evidence dir, fixture
// index, or expected_raw map reachable by path. The child's recompute must equal the committed
// aggregates. Motto: AnthropicSafe First, then ReviewerSafe.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHILD = join(HERE, "recompute-child.mjs");
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-5b");

// Run the blind child over a bundle's findings; return its recomputed output (parsed).
export function runCeremony(bundle) {
  const sterile = mkdtempSync(join(tmpdir(), "var-laneb-"));
  const findingsFile = join(sterile, "findings.json");
  writeFileSync(findingsFile, canonicalJson({ findings: bundle.findings, floors: bundle.floors }));
  const stdout = execFileSync(process.execPath, [CHILD, findingsFile], {
    cwd: sterile, // sterile cwd: nothing but the findings file is reachable by relative path
    env: { PATH: process.env.PATH }, // no OPERATOR_* / hints leak in
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bundle = JSON.parse(readFileSync(join(EVID, "attestation.json"), "utf8"));
  const out = runCeremony(bundle);
  const ok = out.asr === bundle.attestation.aggregates.asr;
  console.log(
    `Lane B blind recompute: asr=${out.asr} committed=${bundle.attestation.aggregates.asr} ${ok ? "MATCH" : "MISMATCH"}`
  );
  process.exit(ok ? 0 : 1);
}
