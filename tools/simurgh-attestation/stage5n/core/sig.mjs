// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — Ed25519 signature verification over a hex digest (pure; no network). "base64:"-prefixed sigs.
import crypto from "node:crypto";

export function verifyEd25519(pubPem, sigStr, digestHex) {
  try {
    if (typeof sigStr !== "string" || !sigStr.startsWith("base64:")) return false;
    const sig = Buffer.from(sigStr.slice("base64:".length), "base64");
    const key = crypto.createPublicKey(pubPem);
    return crypto.verify(null, Buffer.from(digestHex, "hex"), key, sig);
  } catch {
    return false;
  }
}

export function fprOf(pubPem) {
  const der = crypto.createPublicKey(pubPem).export({ type: "spki", format: "der" });
  return "sha256:" + crypto.createHash("sha256").update(der).digest("hex");
}
