// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC attestation verifier (spec §9). Motto: AnthropicSafe First, then ReviewerSafe.
//
// public tier: structure — signature, key digest, Merkle root, two-stage seal.
// audit  tier: additionally reruns evaluateCapsule over every Lane A fixture and
//              asserts each recorded expected_raw (engine re-run).
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest, evaluateCapsuleSafe } from "../core/capsuleCore.mjs";
import { bundleMerkleRoot } from "./build-stage4t-attestation.mjs";
import { buildGreenBundle, STAGE_VERIFIERS } from "./greenCapsule.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4t/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");

// Returns { ok: true } or { ok: false, reason, detail }.
export function verifyAttestation(attestation, { tier = "public", pubKeyPem } = {}) {
  const pub = pubKeyPem ?? readKey("vic");
  const { signature, attestation_digest, ...body } = attestation;

  if (attestation.signing_key_digest !== keyDigest(pub))
    return { ok: false, reason: "signing_key_digest_mismatch" };

  let sigOk = false;
  try {
    sigOk = crypto.verify(
      null,
      Buffer.from(canonicalJson(body)),
      crypto.createPublicKey(pub),
      Buffer.from(signature ?? "", "hex")
    );
  } catch {
    sigOk = false;
  }
  if (!sigOk) return { ok: false, reason: "attestation_signature_invalid" };

  if (attestation.bundle_merkle_root !== bundleMerkleRoot(attestation))
    return { ok: false, reason: "bundle_merkle_root_mismatch" };

  if (attestation_digest !== capsuleAttestationDigest(attestation))
    return { ok: false, reason: "attestation_digest_mismatch" };

  if (tier === "audit") {
    const { pubKeyPem: capsulePub } = buildGreenBundle();
    for (const c of attestation.content.lane_a_fixtures) {
      const got = evaluateCapsuleSafe(c.bundle, {
        capsulePubKeyPem: capsulePub,
        stageVerifiers: STAGE_VERIFIERS,
        ...(c.eval_opts ?? {}),
      });
      if (got.raw !== c.expected_raw)
        return {
          ok: false,
          reason: "lane_a_fixture_falsified",
          detail: { name: c.name, expected: c.expected_raw, got: got.raw },
        };
    }
  }
  return { ok: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tier = process.argv.includes("--tier")
    ? process.argv[process.argv.indexOf("--tier") + 1]
    : "public";
  const path = process.argv[process.argv.length - 1];
  const att = JSON.parse(readFileSync(path, "utf8"));
  const res = verifyAttestation(att, { tier });
  if (res.ok) {
    console.error(`stage4t attestation: ${tier} tier OK`);
    process.exit(0);
  }
  console.error(`stage4t attestation: ${tier} tier FAIL — ${res.reason}`, res.detail ?? "");
  process.exit(1);
}
