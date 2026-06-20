// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3O containment attestation. Reads the private
// key from SIMURGH_BYO_PRIVATE_KEY_PATH (default ~/.simurgh/byo-ed25519.pem);
// CI never runs this. Uses the 3O key identity (NOT the 3M key) but reuses the
// 3M canonicalisation + Ed25519 primitives.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3o";
const PUB = join(EV, "attestation.public-key.json");

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function main() {
  const keyPath =
    process.env.SIMURGH_BYO_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "byo-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = await readJson(PUB);

  const manifest = await readJson(join(EV, "corpus-manifest.json"));
  const reference = await readJson(join(EV, "reference-target-results.json"));
  const selfProof = await readJson(join(EV, "self-proof-results.json"));
  const matrix = await readJson(join(EV, "scoring-matrix-results.json"));

  const bundle = {
    schema: "simurgh.byo.attestation.v1",
    corpus_manifest_sha256: sha256Hex(JSON.stringify(manifest, null, 2) + "\n"),
    reference_metrics: reference.metrics,
    self_proof: {
      clean_reference_target_passed:
        reference.metrics.confirmed_contained === 120 && reference.metrics.overdefence === 0,
      liar_target_claim_conflict_detected: selfProof.liar >= 1,
      leaky_allowed_target_failure_detected: selfProof.leaker >= 1,
      overdefence_target_detected: selfProof.overdefender >= 1,
      invalid_response_target_detected: selfProof.invalid >= 1,
      scoring_matrix_cells_covered: `${matrix.cells_covered}/11`,
    },
    non_claims: {
      does_not_verify_target_internal_logic: true,
      does_not_certify_external_gateways: true,
      does_not_prove_blanket_robustness: true,
      external_targets_measured_not_certified: true,
    },
  };
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.byo.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "containment-attestation.json"), JSON.stringify(bundle, null, 2) + "\n");
  await writeFile(
    join(EV, "containment-attestation.signature.json"),
    JSON.stringify(sidecar, null, 2) + "\n"
  );
  console.log("stage3o: signed attestation + sidecar; fingerprint", sidecar.public_key_fingerprint);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
