// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash, generateKeyPairSync, createPublicKey, sign, verify } from "node:crypto";
import { canonical } from "./corpus.mjs";
import { runOffline, runLive } from "./experiment.mjs";
export function fingerprint(publicKey) {
  return createHash("sha256")
    .update(createPublicKey(publicKey).export({ type: "spki", format: "der" }))
    .digest("hex");
}
export function createArtifact(payload) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    format: "simurgh-self-attestation-v1",
    trust: "self-attested; embedded key does not prove identity, model provenance, or ground truth",
    publicKey: publicKey.export({ type: "spki", format: "pem" }),
    signature: sign(null, Buffer.from(canonical(payload)), privateKey).toString("base64"),
    payload,
  };
}
export function verifyArtifact(artifact, { expectedFingerprint } = {}) {
  const keys = ["format", "trust", "publicKey", "signature", "payload"];
  if (
    !artifact ||
    Object.keys(artifact).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(artifact, k)) ||
    artifact.format !== "simurgh-self-attestation-v1" ||
    artifact.trust !==
      "self-attested; embedded key does not prove identity, model provenance, or ground truth"
  )
    throw new Error("Invalid artifact envelope");
  if (
    typeof artifact.signature !== "string" ||
    !/^[A-Za-z0-9+/]{86}==$/.test(artifact.signature) ||
    Buffer.from(artifact.signature, "base64").toString("base64") !== artifact.signature
  )
    throw new Error("Invalid signature encoding");
  const key = createPublicKey(artifact.publicKey);
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Invalid signing algorithm");
  const keyFingerprint = fingerprint(artifact.publicKey);
  if (expectedFingerprint && expectedFingerprint !== keyFingerprint)
    throw new Error("External fingerprint mismatch");
  if (
    !verify(
      null,
      Buffer.from(canonical(artifact.payload)),
      key,
      Buffer.from(artifact.signature, "base64")
    )
  )
    throw new Error("Signature mismatch");
  let expected;
  if (artifact.payload.track === "offline-synthetic") expected = runOffline();
  else if (artifact.payload.track === "live-openai") {
    // Replay the supplied proposals only. This cannot authenticate an API response.
    const cases = artifact.payload.modes?.enforced?.cases;
    if (!Array.isArray(cases)) throw new Error("Missing live cases");
    const proposals = Object.fromEntries(
      cases.map((c) => [
        c.id,
        c.result.status === "proposal_error"
          ? { error: c.result.reason }
          : { proposal: c.proposal, metadata: c.metadata },
      ])
    );
    expected = runLive(proposals);
  } else throw new Error("Unknown evaluation track");
  if (canonical(expected) !== canonical(artifact.payload))
    throw new Error(
      "Report differs from complete recomputed corpus, policies, sources, effects or metrics"
    );
  return {
    valid: true,
    keyFingerprint,
    trust: expectedFingerprint
      ? "matches externally supplied key fingerprint"
      : "self-attested embedded key only",
    reproduction:
      artifact.payload.track === "offline-synthetic"
        ? "complete deterministic offline replay"
        : "local replay of supplied proposals; model origin unverified",
  };
}
