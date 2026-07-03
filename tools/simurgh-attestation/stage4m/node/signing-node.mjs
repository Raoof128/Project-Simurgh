// SPDX-License-Identifier: AGPL-3.0-or-later
// Node adapter for contest/acknowledgement signing. The browser adapter (Task 10) implements
// the same verifySig contract over WebCrypto — core never touches node:crypto.
import { createPublicKey, sign, verify } from "node:crypto";
import { contestSigningPayload } from "../core/respondentCore.mjs";

export const spkiB64FromPublicKey = (keyObject) =>
  keyObject.export({ type: "spki", format: "der" }).toString("base64");

export function signContest(recordWithoutSignature, privateKey) {
  const record = { ...recordWithoutSignature, signature: "ed25519:" };
  const bytes = Buffer.from(contestSigningPayload(record), "utf8");
  return {
    ...recordWithoutSignature,
    signature: `ed25519:${sign(null, bytes, privateKey).toString("base64")}`,
  };
}

export async function nodeVerifyEd25519({ publicKeySpkiB64, message, signatureB64 }) {
  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeySpkiB64, "base64"),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(message, "utf8"), key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}
