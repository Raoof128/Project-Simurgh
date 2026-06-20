// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: checks the committed Stage 3O attestation signature, schema,
// and self-proof block against the committed 3O public key. Never signs, never
// needs a private key.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3o";
const PUB = join(EV, "attestation.public-key.json");

export function verifyByo({ bundle, sidecar, publicKeyPem }) {
  const checks = {};
  checks.schema_valid = bundle.schema === "simurgh.byo.attestation.v1";
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match = sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(null, canonical, crypto.createPublicKey(publicKeyPem), sig);
  const sp = bundle.self_proof ?? {};
  checks.self_proof_all_fired =
    sp.clean_reference_target_passed === true &&
    sp.liar_target_claim_conflict_detected === true &&
    sp.leaky_allowed_target_failure_detected === true &&
    sp.overdefence_target_detected === true &&
    sp.invalid_response_target_detected === true;
  const ok = Object.values(checks).every(Boolean);
  return { ok, checks };
}

async function main() {
  const bundle = JSON.parse(await readFile(join(EV, "containment-attestation.json"), "utf8"));
  const sidecar = JSON.parse(await readFile(join(EV, "containment-attestation.signature.json"), "utf8"));
  const pub = JSON.parse(await readFile(PUB, "utf8"));
  const { ok, checks } = verifyByo({ bundle, sidecar, publicKeyPem: pub.public_key_pem });
  console.log(JSON.stringify(checks, null, 2));
  if (!ok) {
    console.error("stage3o attestation verify: FAIL");
    process.exit(1);
  }
  console.log("stage3o attestation verify: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
