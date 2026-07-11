// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — build the byte-stable Lane-A evidence pack from committed keys. Deterministic.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../core/digests.mjs";
import { buildSignedBundle } from "./buildSignedBundle.mjs";
import { laneKeys, lanePanelSpec } from "./laneKeys.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const EVIDENCE_DIR = join(ROOT, "docs/research/llm-shield/evidence/stage-5i");

export function buildLaneAEvidence(outDir = EVIDENCE_DIR) {
  const keys = laneKeys();
  const { sections, panel } = lanePanelSpec(keys);
  const { bundle, external_config } = buildSignedBundle(keys, { sections, panel });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "bundle.json"), canonicalJson(bundle) + "\n");
  writeFileSync(join(outDir, "external-config.json"), canonicalJson(external_config) + "\n");
  return { bundle, external_config, outDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { outDir } = buildLaneAEvidence();
  console.log(`Lane-A evidence written to ${outDir}`);
}
