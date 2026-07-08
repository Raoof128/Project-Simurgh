// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — vncCore: artifact signing, the attestation body/merkle binding, and (Task 9)
// the frozen-order verifier evaluateVnc + fail-closed wrapper (209). Plan Tasks 6/9.
// Motto: AnthropicSafe First, then ReviewerSafe.
import crypto from "node:crypto";
import { canonicalJson, recordDigest, merkleRootSorted } from "../../stage4m/core/canonical.mjs";
import { keyDigest } from "../../stage4s/core/receiptBuilder.mjs";
import { VNC_ATTESTATION_SCHEMA } from "../constants.mjs";

// Signed artifact shape {content, signature, author_pub_key_pem} — the 4W narrative pattern.
// The signature covers canonicalJson(content) and verifies against the EMBEDDED public key;
// the DIGEST of record is recordDigest over the WHOLE artifact, so a key-swap re-sign changes
// it and 201 catches it (no key registry needed — reviewer MF5).
export const signArtifact = (content, privPem, pubPem) => ({
  content,
  signature: crypto
    .sign(null, Buffer.from(canonicalJson(content)), crypto.createPrivateKey(privPem))
    .toString("base64"),
  author_pub_key_pem: pubPem,
});

export function verifyArtifactSignature(artifact) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalJson(artifact.content)),
      crypto.createPublicKey(artifact.author_pub_key_pem),
      Buffer.from(artifact.signature ?? "", "base64")
    );
  } catch {
    return false;
  }
}

// The attestation binds the four (or six) artifact digests under one Ed25519 signature.
export function attestationBody(
  { claimTable, ledger, narrative, mapAttestation, reflectionManifest, pilotAdaptation },
  pubPem
) {
  const claim_table_digest = recordDigest(claimTable);
  const ledger_digest = recordDigest(ledger);
  const narrative_digest = recordDigest(narrative);
  const map_attestation_digest = recordDigest(mapAttestation);
  const body = {
    schema: VNC_ATTESTATION_SCHEMA,
    claim_table_digest,
    ledger_digest,
    narrative_digest,
    map_attestation_digest,
  };
  const digests = [claim_table_digest, ledger_digest, narrative_digest, map_attestation_digest];
  if (reflectionManifest) {
    body.reflection_manifest_digest = recordDigest(reflectionManifest);
    digests.push(body.reflection_manifest_digest);
  }
  if (pilotAdaptation) {
    body.pilot_adaptation_digest = recordDigest(pilotAdaptation);
    digests.push(body.pilot_adaptation_digest);
  }
  body.bundle_merkle_root = merkleRootSorted(digests);
  body.signing_key_digest = keyDigest(pubPem);
  return body;
}

export function signVncAttestation(parts, pubPem, privPem) {
  const body = attestationBody(parts, pubPem);
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(body)), crypto.createPrivateKey(privPem))
    .toString("hex");
  return { ...body, signature };
}
