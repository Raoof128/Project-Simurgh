// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC evidence builder (Lane A synthetic, deterministic → byte stable). Writes the evidence
// pack + the EXTERNAL config (verifier pin + trust root) OUTSIDE the evidence dir.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { buildSyntheticBundle } from "./buildBundle.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5g");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5g");
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

export function buildEvidence({ evidenceDir = EVID, stageDir = STAGE } = {}) {
  const { bundle, census, artifacts, pin } = buildSyntheticBundle();
  mkdirSync(evidenceDir, { recursive: true });
  writeJson(join(evidenceDir, "vfc-attestation.json"), bundle);
  writeJson(join(evidenceDir, "capture-census.json"), census);
  writeJson(join(evidenceDir, "panel-plan.json"), artifacts.panelPlan);
  writeJson(join(evidenceDir, "shared-corpus.json"), artifacts.corpus);
  writeJson(join(evidenceDir, "detector-snapshot-manifest.json"), artifacts.detectorSnapshot);
  // External config — NEVER inside the evidence dir, never a pack default.
  writeJson(join(stageDir, "pin.json"), pin);
  writeJson(join(stageDir, "trust-root.json"), {
    schema_version: "0.3",
    fulcio_root_fingerprints: [],
    note: "rung-2 Sigstore roots go here; the Lane-A synthetic evidence is rung-1 (no anchor).",
  });
  return { evidenceDir, stageDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { evidenceDir } = buildEvidence();
  console.log(`[5g] wrote VFC evidence to ${evidenceDir}`);
}
