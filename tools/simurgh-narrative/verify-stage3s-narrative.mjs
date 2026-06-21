// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: signature + receipt-binding + digest-binding + no-finding checks.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3s";

export function verifyNarrative({ artifact, sidecar, publicKeyPem, digest, modelSlots, receipt }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(artifact), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  checks.digest_binding = artifact.evidence_digest_hash === sha256Hex(canonicalJson(digest));
  checks.receipt_binding = modelSlots.source.gateway_output_hash === receipt.output_hash;
  checks.no_automatic_finding = artifact.automatic_finding_made === false;
  checks.no_rendered_conflicts = (artifact.narrative_claim_conflicts_rendered ?? 0) === 0;
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

async function main() {
  const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
  const artifact = await rd("verified/verified-narrative-artifact.json");
  const sidecar = await rd("verified/verified-narrative-artifact.signature.json");
  const digest = await rd("digest/evidence-digest.json");
  const modelSlots = await rd("model-slots/model-slots.json");
  const receipt = await rd("model-slots/gateway-receipt.json");
  const pub = await rd("keys/stage3s-public-key.json");
  const { ok, checks } = verifyNarrative({
    artifact,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    digest,
    modelSlots,
    receipt,
  });
  console.log(JSON.stringify(checks, null, 2));
  if (!ok) {
    console.error("stage3s narrative verify: FAIL");
    process.exit(1);
  }
  console.log("stage3s narrative verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
