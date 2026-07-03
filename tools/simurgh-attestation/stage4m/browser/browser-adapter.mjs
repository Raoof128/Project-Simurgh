// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser adapter: identical verifySig contract over WebCrypto. Runs in Node 26 too
// (globalThis.crypto.subtle), which is exactly what makes V16 parity honest. No node imports.
export async function webcryptoVerifyEd25519({ publicKeySpkiB64, message, signatureB64 }) {
  try {
    const der = Uint8Array.from(atob(publicKeySpkiB64), (c) => c.charCodeAt(0));
    const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const key = await globalThis.crypto.subtle.importKey("spki", der, { name: "Ed25519" }, false, [
      "verify",
    ]);
    return globalThis.crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      sig,
      new TextEncoder().encode(message)
    );
  } catch {
    return false;
  }
}
