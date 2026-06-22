// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier verifier. Portable: signature + bindings (incl. BOTH result digests) + identity
// + non-claim wall. --reproduce: re-run detectorV2 over BOTH committed sets + self-proof +
// attestation byte-identity.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { metaSetDigestV2 } from "./metaSetV2.mjs";
import { familyMapDigestV2 } from "./signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "./metadataGrammar.mjs";
import { runDetectorV2 } from "./detectorV2.mjs";
import { runExtractionSelfProofV2 } from "./selfProofV2.mjs";
import { deriveForVerifyV2 } from "./simurgh-extraction-v2.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3u";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const resultDigest = (result) => sha256Hex(canonicalJson(result));

export function verifyExtractionV2({
  attestation,
  sidecar,
  publicKeyPem,
  mainSet,
  regressionSet,
  detectorConfig,
}) {
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
  checks.detector_id_v2 =
    attestation.detector_id === "stage3u_extraction_detector_v2" &&
    detectorConfig.detector_id === attestation.detector_id;
  checks.previous_detector_id_v1 =
    attestation.previous_detector_id === "stage3t_frozen_detector_v1";
  checks.meta_set_digest_binding = attestation.meta_set_digest === metaSetDigestV2(mainSet);
  checks.main_result_digest_binding =
    attestation.detector_result_digest === resultDigest(runDetectorV2(mainSet));
  checks.regression_meta_set_digest_binding =
    attestation.redteam_regression_meta_set_digest === metaSetDigestV2(regressionSet);
  checks.regression_result_digest_binding =
    attestation.redteam_regression_result_digest === resultDigest(runDetectorV2(regressionSet));
  checks.regression_did_not_escalate =
    attestation.red_team_hardening?.redteam_regression_decision === "single_signal_observed";
  checks.family_map_digest_match =
    attestation.family_map_digest === familyMapDigestV2() &&
    detectorConfig.family_map_digest === familyMapDigestV2();
  checks.metadata_grammar_digest_match =
    attestation.metadata_grammar_digest === metadataGrammarDigest() &&
    detectorConfig.metadata_grammar_digest === metadataGrammarDigest();
  checks.decision_present = [
    "no_pattern_observed",
    "single_signal_observed",
    "extraction_pattern_observed",
  ].includes(attestation.decision);
  checks.no_intent_claim =
    attestation.intent_claim_made === false &&
    !!attestation.non_claims?.includes("no_intent_claim");
  checks.match_is_not_accusation = !!attestation.non_claims?.includes("match_is_not_accusation");
  checks.known_limitation_disclosed = !!attestation.known_limitations?.includes(
    "benign_mono_task_plus_shared_template_can_present_two_strong_families"
  );
  return { ok: Object.values(checks).every(Boolean), checks };
}

async function main() {
  const reproduce = process.argv.includes("--reproduce");
  const attestation = await rd("result/attestation.json");
  const sidecar = await rd("result/attestation.signature.json");
  const pub = await rd("keys/stage3u-public-key.json");
  const detectorConfig = await rd("meta-set/detector-config.json");
  const mainSet = await rd("meta-set/metadata-set-v2.json");
  const regressionSet = await rd("meta-set/redteam-a10-regression-set.json");
  const { ok, checks } = verifyExtractionV2({
    attestation,
    sidecar,
    publicKeyPem: pub.public_key_pem,
    mainSet,
    regressionSet,
    detectorConfig,
  });
  let reproduced = true;
  if (reproduce) {
    const { attestation: regen, mainResult, regressionResult } = await deriveForVerifyV2();
    checks.main_result_reproduces =
      stable(mainResult) === stable(await rd("result/expected-detector-result-v2.json"));
    checks.regression_result_reproduces =
      stable(regressionResult) === stable(await rd("result/redteam-regression-result.json"));
    checks.attestation_reproduces = stable(regen) === stable(await rd("result/attestation.json"));
    const sp = runExtractionSelfProofV2();
    checks.self_proof_passes = sp.summary.all_passed === true;
    reproduced =
      checks.main_result_reproduces &&
      checks.regression_result_reproduces &&
      checks.attestation_reproduces &&
      checks.self_proof_passes;
  }
  console.log(JSON.stringify(checks, null, 2));
  if (!ok || !reproduced) {
    console.error("stage3u verify: FAIL");
    process.exit(1);
  }
  console.log("stage3u attestation verify: PASS");
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3u verify:", e.message);
    process.exit(1);
  });
