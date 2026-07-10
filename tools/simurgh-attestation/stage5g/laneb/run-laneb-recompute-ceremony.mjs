// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC Lane B process-2 runner. Independently recomputes over the committed evidence and signs
// the sidecar receipt under the ceremony key, verified by the EXTERNAL ceremony pin. Sidecar only.
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { runCeremony } from "./ceremony.mjs";
import { fingerprint } from "../core/signatures.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5g");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5g");
const KEYS = join(ROOT, "tests/fixtures/llmShield/stage5g/test-keys");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function runLanebCeremony({ dir = EVID } = {}) {
  const bundle = readJson(join(dir, "vfc-attestation.json"));
  const artifacts = {
    panelPlan: readJson(join(dir, "panel-plan.json")),
    corpus: readJson(join(dir, "shared-corpus.json")),
    detectorSnapshot: readJson(join(dir, "detector-snapshot-manifest.json")),
  };
  const pin = readJson(join(STAGE, "pin.json"));
  const ceremonyPriv = readFileSync(
    join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc-ceremony.pem"),
    "utf8"
  );
  const ceremonyPubPem = createPublicKey(createPrivateKey(ceremonyPriv))
    .export({ type: "spki", format: "pem" })
    .toString();
  const ctx = {
    tier: "public",
    verifierPin: pin,
    trustRootAllowlist: [],
    artifacts,
    auditCensus: null,
    kernelResult: null,
    diag: {},
  };
  return runCeremony(bundle, {
    ceremonyPriv,
    ceremonyPubPem,
    pinFingerprint: fingerprint(ceremonyPubPem),
    ctx,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = runLanebCeremony();
  console.log(
    JSON.stringify({ laneb_corroborated: r.corroborated, receipt_valid: r.receiptValid })
  );
  process.exitCode = r.corroborated && r.receiptValid ? 0 : 1;
}
