// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR Lane B — the DUMB parent (plan Task 9). It spawns the blind child, feeds it ONLY
// the corpus path + public ruleset digests, and byte-compares the child's recomputed ledger to the
// committed one. The parent imports NO gate/ledger module and computes NO catch-rate itself — it
// proves process-isolated recomputation (NOT implementation-independence). Motto: AnthropicSafe First.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4x");
const CHILD = join(HERE, "recompute-child.mjs");

export function runCeremony({ dir = EVID } = {}) {
  const corpusPath = join(dir, "corpus.json");
  const committedLedgerBytes = readFileSync(join(dir, "ledger.json"), "utf8");
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));

  // Scrub the child's env: strip every OPERATOR_* key (blindness negative).
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (!/^OPERATOR_/.test(k)) env[k] = v;

  const child = spawnSync(process.execPath, [CHILD], {
    input: JSON.stringify({
      corpus_path: corpusPath,
      v1_digest: corpus.ruleset_binding.v1_ruleset_digest,
      v2_digest: corpus.ruleset_binding.v2_ruleset_digest,
    }),
    env,
    encoding: "utf8",
  });
  if (child.status !== 0) throw new Error(`lane B child failed (${child.status}): ${child.stderr}`);

  const match = child.stdout === committedLedgerBytes;
  const capture = {
    schema: "simurgh.vlr.laneb_capture.v1",
    match,
    // The blindness negatives, sealed:
    parent_computed_catch_rate: false,
    child_received_committed_ledger_path: false,
    child_received_operator_env: false,
  };
  return capture;
}

export function writeCapture({ dir = EVID } = {}) {
  const capture = runCeremony({ dir });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "laneb-capture.json"), JSON.stringify(capture, null, 2) + "\n");
  return capture;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = writeCapture();
  console.log(
    `Stage 4X Lane B: blind child recompute ${c.match ? "MATCHES" : "DIVERGES FROM"} committed ledger.`
  );
  process.exit(c.match ? 0 : 1);
}
