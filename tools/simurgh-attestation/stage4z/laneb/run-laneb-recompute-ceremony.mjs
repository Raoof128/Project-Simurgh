// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA Lane B — blind two-process recompute ceremony (plan Task 10). The parent copies
// the capture-input set into an isolated temp dir, spawns the blind child, and asserts the
// child's rebuilt map equals the committed map byte-for-byte. Blindness is stdin-data isolation
// (the child gets inputs, never the committed map/audit). Motto: AnthropicSafe First, then
// ReviewerSafe.
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-4z");
const CHILD = join(HERE, "recompute-child.mjs");

// Extract the child's input message (the capture-input set) from a committed bundle.
function inputMessage(bundle) {
  return {
    declaration: bundle.declaration,
    tensors: bundle.audit.tensors,
    salts: bundle.audit.salts,
    self_report: bundle.map.self_report,
    provenance: bundle.map.provenance,
  };
}

function runChild(msg, extraEnv = {}) {
  const dir = mkdtempSync(join(tmpdir(), "vwa-laneb-"));
  const msgPath = join(dir, "input.json");
  writeFileSync(msgPath, JSON.stringify(msg));
  return spawnSync(process.execPath, [CHILD], {
    input: readFileSync(msgPath),
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
}

export function ceremony({ dir = EVID, fixtureId = "synthetic_clean_injection_detect" } = {}) {
  const bundle = JSON.parse(readFileSync(join(dir, `${fixtureId}.bundle.json`), "utf8"));
  const positive = runChild(inputMessage(bundle));
  const rebuilt = positive.status === 0 ? positive.stdout.trim() : null;
  const committed = canonicalJson(bundle.map);
  const match = rebuilt === committed;

  // Blindness negatives — each must exit 2.
  const envLeak = runChild(inputMessage(bundle), { OPERATOR_SECRET: "x" });
  const answerLeak = runChild({ ...inputMessage(bundle), committed_map: bundle.map });

  return {
    ok: match && envLeak.status === 2 && answerLeak.status === 2,
    positive_match: match,
    env_leak_refused: envLeak.status === 2,
    answer_leak_refused: answerLeak.status === 2,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = ceremony();
  console.log(JSON.stringify(r, null, 2));
  console.log(`Stage 4Z Lane B: ${r.ok ? "PASS" : "FAIL"}`);
  process.exit(r.ok ? 0 : 1);
}
