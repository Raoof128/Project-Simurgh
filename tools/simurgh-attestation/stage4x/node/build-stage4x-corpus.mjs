// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — build the Lane A corpus as byte-stable evidence (plan Task 8).
// Build-time guards (self-gauntlet): every residue_form must actually slip v1 (residue_v1===false),
// and every incident_sourced item must be primary-pinned or "reported" BEFORE signing (Finding 3).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { checkLeakage } from "../../stage4w/core/leakageGate.mjs";
import { buildCorpus } from "../core/corpusSource.mjs";
import { validateCorpusSchema, checkCorpusWellFormed } from "../core/corpusCore.mjs";
import { pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, "../../../../docs/research/llm-shield/evidence/stage-4x");

export function buildAndAssertCorpus() {
  const corpus = buildCorpus();
  const s = validateCorpusSchema(corpus);
  if (s) throw new Error(`corpus schema invalid: ${JSON.stringify(s)}`);
  const w = checkCorpusWellFormed(corpus);
  if (w) throw new Error(`corpus not well-formed: ${JSON.stringify(w)}`);
  for (const it of corpus.items) {
    // Residue MUST slip v1 — a residue that trips v1 is a construction bug, not residue.
    if (checkLeakage(it.residue_form, [], []) !== null)
      throw new Error(`residue_form does not slip v1 (construction bug): ${it.item_id}`);
    // Source-precision: incident_sourced items must be pinned or explicitly "reported".
    if (
      it.provenance === "incident_sourced" &&
      !(typeof it.incident_ref === "string" && it.incident_ref.length > 0)
    )
      throw new Error(`incident_sourced item missing pinned/reported incident_ref: ${it.item_id}`);
  }
  return corpus;
}

export function writeCorpus() {
  const corpus = buildAndAssertCorpus();
  mkdirSync(OUTDIR, { recursive: true });
  writeFileSync(join(OUTDIR, "corpus.json"), canonicalJson(corpus) + "\n");
  return corpus;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeCorpus();
  console.log("Stage 4X corpus written (residue-slips-v1 + source-precision asserted).");
}
