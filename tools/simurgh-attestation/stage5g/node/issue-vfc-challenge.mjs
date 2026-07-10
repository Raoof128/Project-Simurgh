// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC challenge issuer. Assembles the committed artifact references, mints a fresh ≥256-bit
// nonce, derives challenge_record_digest, signs the receipt with the verifier key, and writes NO capture
// or attestation. The nonce proves substitution-resistance (this capture answers THIS committed
// challenge), NOT wall-clock freshness.
import { randomBytes } from "node:crypto";
import { domainDigest, identityDigest, artifactDigest } from "../core/digests.mjs";
import { signContent } from "../core/signatures.mjs";
import { DOMAIN, VFC_SCHEMAS } from "../constants.mjs";

export function issueChallengeReceipt({
  verifierPriv,
  verifierIdentity,
  corpus,
  panelPlan,
  detectorSnapshot,
  nonce, // Buffer, optional (deterministic issuance for fixtures/tests)
  challengeId,
}) {
  const nonceBuf = nonce ?? randomBytes(32);
  if (nonceBuf.length < 32) throw new Error("challenge nonce must be >= 256 bits");
  const content = {
    challenge_id: challengeId ?? `vfc-${randomBytes(8).toString("hex")}`,
    nonce: nonceBuf.toString("base64"),
    panel_plan_digest: artifactDigest(panelPlan),
    corpus_digest: artifactDigest(corpus),
    detector_snapshot_digest: artifactDigest(detectorSnapshot),
    verifier_identity_digest: identityDigest(verifierIdentity, "verifier"),
  };
  return {
    schema: VFC_SCHEMAS.challenge_receipt,
    content,
    challenge_record_digest: domainDigest(DOMAIN.challenge_receipt, content),
    verifier_signature: signContent(verifierPriv, DOMAIN.challenge_receipt, content),
  };
}
