// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — Lane B ceremony runner (plan Task 17). Process 2: independently recompute the five
// receipt digests from the committed public+audit artifacts and assert they equal the ceremony-signed
// receipt, under an EXTERNALLY pinned ceremony fingerprint. Two-process/two-key separation — NOT
// independent-party verification.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { verifyReceipt } from "./ceremony.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5f");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5f");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function runCeremony({ pinnedCeremonyFingerprint } = {}) {
  const bundle = readJson(join(EVID, "vmp-attestation.json"));
  const auditPrivate = readJson(join(EVID, "capture-census.json"));
  const receipt = readJson(join(EVID, "laneb-receipt.json"));
  const pin = pinnedCeremonyFingerprint ?? readJson(join(STAGE, "pin.json")).ceremony_fingerprint;
  return verifyReceipt(receipt, bundle, auditPrivate, pin);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const code = runCeremony();
  console.log(JSON.stringify({ laneb_recompute: code === 0 ? "corroborated" : "FAILED", code }));
  process.exit(code === 0 ? 0 : 1);
}
