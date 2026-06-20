// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer. Reads the private key from SIMURGH_VCA_PRIVATE_KEY_PATH,
// builds the run-set bundle from committed Stage 3L evidence, and writes the
// canonical bundle + detached Ed25519 signature sidecar.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import { STAGE3L_EVIDENCE_PATHS, buildBundle } from "./attestationLib.mjs";

const OUT = "docs/research/llm-shield/evidence/stage-3m";
const PUBLIC_KEY_JSON = join(OUT, "attestation.public-key.json");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const keyPath = process.env.SIMURGH_VCA_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error("SIMURGH_VCA_PRIVATE_KEY_PATH is required to sign");
  const privPem = await readFile(keyPath, "utf8");
  const pub = await readJson(PUBLIC_KEY_JSON);

  const referencedEvidence = [];
  for (const path of STAGE3L_EVIDENCE_PATHS) {
    referencedEvidence.push({ path, sha256: sha256Hex(await readFile(path)) });
  }

  const bundle = buildBundle({
    metrics: await readJson(STAGE3L_EVIDENCE_PATHS[0]), // metrics.json
    boundaryBreakdown: await readJson(STAGE3L_EVIDENCE_PATHS[2]), // boundary-breakdown.json
    policyDigests: await readJson(STAGE3L_EVIDENCE_PATHS[3]), // detector-digests.json
    privacyReport: await readJson(STAGE3L_EVIDENCE_PATHS[6]), // generated-evidence-privacy-report.json
    referencedEvidence,
  });

  const canonicalBytes = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonicalBytes, crypto.createPrivateKey(privPem));
  const sidecar = {
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonicalBytes),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };

  await writeFile(join(OUT, "attestation.bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
  await writeFile(join(OUT, "attestation.signature.json"), JSON.stringify(sidecar, null, 2) + "\n");
  console.log("signed: bundle + sidecar written to", OUT);
  console.log("fingerprint:", sidecar.public_key_fingerprint);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
