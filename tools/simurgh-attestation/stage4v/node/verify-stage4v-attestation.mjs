// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V VDP attestation verifier (spec §9). Motto: AnthropicSafe First, then ReviewerSafe.
//
// public tier: structure — signature, key digest, Merkle root, two-stage seal.
// audit  tier: additionally reruns evaluateContestSafe over every Lane A fixture
//              (asserting expected_raw + expected_envelope_digest) AND re-verifies the
//              sealed Lane B capture (P1 #9) — Lane B is evidence, not cargo.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest } from "../../stage4t/core/capsuleCore.mjs";
import { STAGE_VERIFIERS } from "../../stage4t/node/greenCapsule.mjs";
import { evaluateContestSafe } from "../core/counterCapsuleCore.mjs";
import { verifyContestLaneBCapture } from "../laneb/run-laneb-contest-ceremony.mjs";
import { corpusDocument } from "./build-stage4v-fixtures.mjs";
import { bundleMerkleRoot } from "./build-stage4v-attestation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const readPub = () =>
  readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vdp.pub.pem"), "utf8");

export function verifyAttestation(attestation, { tier = "public", pubKeyPem } = {}) {
  const pub = pubKeyPem ?? readPub();
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
    const c = attestation.content;
    const doc = corpusDocument();
    const opts = {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
    };
    for (const fx of c.lane_a_fixtures) {
      const bundle = fx.capsule_override ?? doc.reference_capsule_bundle;
      const res = evaluateContestSafe(bundle, fx.counter_capsule, {
        ...opts,
        ...(fx.eval_opts ?? {}),
      });
      if (res.raw !== fx.expected_raw)
        return {
          ok: false,
          reason: "lane_a_fixture_falsified",
          detail: { name: fx.name, expected: fx.expected_raw, got: res.raw },
        };
      if (recordDigest(res.envelope) !== fx.expected_envelope_digest)
        return { ok: false, reason: "lane_a_envelope_falsified", detail: { name: fx.name } };
    }
    if (c.lane_b_capture) {
      const lb = verifyContestLaneBCapture(c.lane_b_capture);
      if (!lb.ok) return { ok: false, reason: "lane_b_capture_falsified", detail: lb };
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
    console.error(`stage4v attestation: ${tier} tier OK`);
    process.exit(0);
  }
  console.error(`stage4v attestation: ${tier} tier FAIL — ${res.reason}`, res.detail ?? "");
  process.exit(1);
}
