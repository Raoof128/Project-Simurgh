// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane A evidence writer. Writes the evidence pack + the EXTERNAL config (verifier pin
// + host registry) OUTSIDE the evidence dir. Artefact files are inventory-driven (every present[]
// artefact is written from the bundle's artefact map — never a hardcoded filename list).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { buildSyntheticBundle } from "./buildBundle.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5h");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5h");
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

export function buildEvidence({ evidenceDir = EVID, stageDir = STAGE } = {}) {
  const { bundle, artefacts, recipes, pin, hostRegistry } = buildSyntheticBundle();
  mkdirSync(join(evidenceDir, "artefacts"), { recursive: true });
  writeJson(join(evidenceDir, "vsd-attestation.json"), bundle);
  writeJson(join(evidenceDir, "claim-inventory.json"), bundle.claim_inventory);
  writeJson(join(evidenceDir, "review-receipts.json"), bundle.review_receipts);
  writeJson(join(evidenceDir, "recompute-recipe.json"), recipes);
  writeJson(join(evidenceDir, "inventory-census.json"), {
    claim_ids: bundle.claim_inventory.content.claims.map((c) => c.claim_id).sort(),
    artefact_ids: bundle.artefacts_ref.map((a) => a.artefact_id).sort(),
  });
  // inventory-driven artefact files — one per present[] artefact across all claims + refs
  for (const a of bundle.artefacts_ref) {
    writeJson(join(evidenceDir, "artefacts", `${a.artefact_id}.json`), artefacts[a.artefact_id]);
  }
  // External config — NEVER inside the evidence dir, never a pack default.
  writeJson(join(stageDir, "pin.json"), pin);
  writeJson(join(stageDir, "host-registry.json"), hostRegistry);
  return { evidenceDir, stageDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { evidenceDir } = buildEvidence();
  console.log(`[5h] wrote VSD evidence to ${evidenceDir}`);
}
