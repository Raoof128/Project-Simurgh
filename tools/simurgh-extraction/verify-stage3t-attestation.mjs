// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier. Portable: signature + bindings + non-claim wall. --reproduce:
// additionally re-runs the detector and byte-compares the committed result + attestation.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { metaSetDigest } from "./metaSet.mjs";
import { familyMapDigest } from "./signalFamilies.mjs";
import { runExtractionSelfProof } from "./selfProof.mjs";
import { deriveForVerify } from "./simurgh-extraction.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3t";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function verifyExtraction({ attestation, sidecar, publicKeyPem, set, detectorConfig }) {
  const checks = {};
  const canonical = Buffer.from(canonicalJson(attestation), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64")
  );
  // Real binding: the attestation's digest must equal the committed set's digest.
  checks.meta_set_digest_binding = attestation.meta_set_digest === metaSetDigest(set);
  checks.family_map_digest_match =
    attestation.family_map_digest === familyMapDigest() &&
    detectorConfig.family_map_digest === familyMapDigest();
  checks.detector_id_binding = detectorConfig.detector_id === attestation.detector_id;
  checks.threshold_lock_present = detectorConfig.threshold_change_requires_new_detector_id === true;
  checks.decision_present = [
    "no_pattern_observed",
    "single_signal_observed",
    "extraction_pattern_observed",
  ].includes(attestation.decision);
  checks.no_intent_claim =
    attestation.intent_claim_made === false && attestation.non_claims.includes("no_intent_claim");
  checks.match_is_not_accusation = attestation.non_claims.includes("match_is_not_accusation");
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function main() {
  const reproduce = process.argv.includes("--reproduce");
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3t-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const set = await rd("meta-set/metadata-set.json");
  const { ok, checks } = verifyExtraction({
    attestation,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    set,
    detectorConfig,
  });
  let reproduced = true;
  if (reproduce) {
    const { attestation: regenerated, result } = await deriveForVerify();
    const committedResult = await rd("result/expected-detector-result.json");
    const committedAttestation = await rd("result/attestation.json");
    checks.detector_result_reproduces = stable(result) === stable(committedResult);
    checks.attestation_reproduces = stable(regenerated) === stable(committedAttestation);
    const sp = runExtractionSelfProof();
    checks.self_proof_passes = sp.summary.all_passed === true;
    reproduced =
      checks.detector_result_reproduces &&
      checks.attestation_reproduces &&
      checks.self_proof_passes;
  }
  console.log(JSON.stringify(checks, null, 2));
  if (process.argv.includes("--write")) {
    await writeFile(join(EV, "result", "verify-report.json"), stable(checks));
  }
  if (!ok || !reproduced) {
    console.error("stage3t verify: FAIL");
    process.exit(1);
  }
  console.log("stage3t attestation verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3t verify:", e.message);
    process.exit(1);
  });
