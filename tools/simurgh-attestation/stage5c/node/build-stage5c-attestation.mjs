// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — build the byte-stable green attestation (plan Task 11). Motto: AnthropicSafe
// First, then ReviewerSafe. Deterministic: committed key + frozen corpus → identical bytes.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { FLAGGED_BASES } from "../core/corpus.mjs";
import { buildGreenBundle } from "./greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..");
const KEY = join(
  REPO,
  "tests/fixtures/llmShield/stage5c/test-keys/INSECURE_FIXTURE_ONLY_stage-vsb.pem"
);
const EVIDENCE_DIR = join(REPO, "docs/research/llm-shield/evidence/stage-5c");

export function buildEvidence() {
  const priv = readFileSync(KEY, "utf8");
  const bundle = buildGreenBundle(priv, FLAGGED_BASES);
  const slipped = bundle.grid.filter((c) => c.cell_class === "slipped").length;
  const total = bundle.grid.length;
  const summary = {
    schema: "simurgh.vsb.summary.v1",
    total_cells: total,
    slipped,
    caught: bundle.grid.filter((c) => c.cell_class === "caught").length,
    not_applicable: bundle.grid.filter((c) => c.cell_class === "not_applicable").length,
    degenerate: bundle.grid.filter((c) => c.cell_class === "degenerate").length,
    slip_table_size: bundle.slip_table.length,
  };
  return { bundle, summary };
}

export function writeEvidence() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const { bundle, summary } = buildEvidence();
  writeFileSync(join(EVIDENCE_DIR, "green-slip-ledger.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(EVIDENCE_DIR, "summary.json"), canonicalJson(summary) + "\n");
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = writeEvidence();
  console.log("stage-5c evidence written:", JSON.stringify(s));
}
