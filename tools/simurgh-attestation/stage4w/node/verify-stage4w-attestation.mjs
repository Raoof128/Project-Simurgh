// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W VSN attestation verifier (spec §3). Motto: AnthropicSafe First, then ReviewerSafe.
//
// public tier: structure — key digest, signature, Merkle root, two-stage seal.
// audit  tier: additionally rebuilds every Lane A fixture and asserts BOTH the sealed
//              narrative_digest AND expected_raw still hold (the digest match is what
//              catches a validly re-signed pack); re-verifies Lane B raw 0; recomputes
//              the density triple and the bridge subject digest.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson, recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { capsuleAttestationDigest } from "../../stage4t/core/capsuleCore.mjs";
import { evaluateNarrativeSafe, computeEvidenceDensity } from "../core/narrativeCore.mjs";
import { narrativeBodyDigest, spanMapDigest } from "../core/narrativeBinding.mjs";
import { buildLaneAFixtures } from "./build-stage4w-fixtures.mjs";
import { buildGreenNarrative } from "./greenNarrative.mjs";
import { bundleMerkleRoot } from "./build-stage4w-attestation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4w/test-keys");
const readPub = () => readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_vsn.pub.pem"), "utf8");

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
    const g = buildGreenNarrative();
    const fixtures = new Map(buildLaneAFixtures().map((f) => [f.name, f]));
    for (const sealed of c.lane_a_fixtures) {
      const fx = fixtures.get(sealed.name);
      if (!fx)
        return { ok: false, reason: "lane_a_fixture_missing", detail: { name: sealed.name } };
      // Digest match is what catches a validly re-signed swapped pack (raw would still hold).
      if (recordDigest(fx.narrative) !== sealed.narrative_digest)
        return { ok: false, reason: "lane_a_fixture_falsified", detail: { name: sealed.name } };
      const res = evaluateNarrativeSafe(g.capsuleBundle, fx.narrative, {
        capsulePubKeyPem: g.capsulePubKeyPem,
        ctx: {},
      });
      if (res.raw !== sealed.expected_raw)
        return {
          ok: false,
          reason: "lane_a_fixture_falsified",
          detail: { name: sealed.name, expected: sealed.expected_raw, got: res.raw },
        };
    }
    if (c.lane_b_capture) {
      const lb = c.lane_b_capture;
      const res = evaluateNarrativeSafe(g.capsuleBundle, lb.narrative, {
        capsulePubKeyPem: g.capsulePubKeyPem,
        ctx: {},
      });
      if (res.raw !== 0 || lb.verify_raw !== 0)
        return { ok: false, reason: "lane_b_capture_falsified", detail: { raw: res.raw } };
    }
    // Recompute the density triple + bridge subject over the green narrative.
    const density = computeEvidenceDensity(g.narrative.content);
    if (recordDigest(density) !== recordDigest(c.evidence_density))
      return { ok: false, reason: "evidence_density_falsified" };
    const bs = c.bridge_subject;
    if (
      bs.narrative_body_digest !== narrativeBodyDigest(g.narrative.content.narrative_body) ||
      bs.span_map_digest !== spanMapDigest(g.narrative.content.span_map)
    )
      return { ok: false, reason: "bridge_subject_falsified" };
  }
  return { ok: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tier = process.argv.includes("--audit") ? "audit" : "public";
  const path = process.argv[process.argv.length - 1];
  const att = JSON.parse(readFileSync(path, "utf8"));
  const res = verifyAttestation(att, { tier });
  if (res.ok) {
    console.error(`stage4w attestation: ${tier} tier OK`);
    process.exit(0);
  }
  console.error(`stage4w attestation: ${tier} tier FAIL — ${res.reason}`, res.detail ?? "");
  process.exit(1);
}
