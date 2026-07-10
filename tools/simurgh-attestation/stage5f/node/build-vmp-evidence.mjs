// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — evidence pack builder (plan Task 16/24b). Byte-stable under Node 26. Writes the public
// attestation, the audit-private census, the Lane-A replay output, and the external trust pin (OUTSIDE
// the evidence dir — informational copy only in the pack). NEVER writes a private key into evidence.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildPanel } from "./buildPanel.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5f");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5f");

function writeJson(path, value) {
  writeFileSync(path, canonicalJson(value) + "\n");
}

export function buildEvidence() {
  const { bundle, auditPrivate, replayResults, receipt, pinnedFingerprint, ceremonyFingerprint } =
    buildPanel();
  mkdirSync(EVID, { recursive: true });
  writeJson(join(EVID, "vmp-attestation.json"), bundle);
  writeJson(join(EVID, "capture-census.json"), auditPrivate);
  writeJson(join(EVID, "vmp-replay-results.json"), replayResults);
  writeJson(join(EVID, "laneb-receipt.json"), receipt);
  writeJson(join(EVID, "vmp-pinned-key.json"), {
    note: "informational only — trust comes from the external pin",
    attestation_fingerprint: pinnedFingerprint,
  });
  // External trust pins live OUTSIDE the evidence pack (installed-trust-store analogue).
  writeJson(join(STAGE, "pin.json"), {
    attestation_fingerprint: pinnedFingerprint,
    ceremony_fingerprint: ceremonyFingerprint,
  });
  if (canonicalJson(bundle).includes("PRIVATE KEY"))
    throw new Error("refusing to write a private key into evidence");
  return { evidenceDir: EVID };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { evidenceDir } = buildEvidence();
  console.log(`[stage5f] evidence written to ${evidenceDir}`);
}
