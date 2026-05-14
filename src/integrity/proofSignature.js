import crypto from "node:crypto";

// DER prefix for "SubjectPublicKeyInfo wrapping an Ed25519 public key".
// Structure:
//   30 2a            — SEQUENCE, length 42
//     30 05          — SEQUENCE (AlgorithmIdentifier), length 5
//       06 03 2b 65 70 — OID 1.3.101.112 (Ed25519)
//     03 21 00       — BIT STRING, length 33 (32 key bytes + 1 unused-bits byte)
// Concatenated with the 32-byte raw public key, this is a valid SPKI DER blob
// that Node's crypto.createPublicKey() accepts.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const RAW_PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

/**
 * Wrap a raw 32-byte Ed25519 public key in the SPKI envelope required by
 * Node's crypto.createPublicKey(). Throws "invalid_public_key" on bad input.
 */
export function createEd25519PublicKeyFromRaw(rawPublicKey) {
  if (!Buffer.isBuffer(rawPublicKey) || rawPublicKey.length !== RAW_PUBLIC_KEY_BYTES) {
    throw new Error("invalid_public_key");
  }
  return crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
    format: "der",
    type: "spki",
  });
}

/**
 * SHA-256 of the raw 32-byte public key, returned as 64-char lowercase hex.
 * This is the node_id_hash carried in the proof envelope.
 */
export function computeNodeIdHash(rawPublicKey) {
  if (!Buffer.isBuffer(rawPublicKey) || rawPublicKey.length !== RAW_PUBLIC_KEY_BYTES) {
    throw new Error("invalid_public_key");
  }
  return crypto.createHash("sha256").update(rawPublicKey).digest("hex");
}

/**
 * Verify an Ed25519 signature over the canonical proof bytes.
 * Returns true/false. Never throws on bad signatures or bad keys —
 * malformed inputs return false so the caller can return a single
 * uniform "invalid_signature" reason code.
 */
export function verifyProofSignature(canonical, rawPubBytes, signatureBytes) {
  if (!Buffer.isBuffer(signatureBytes) || signatureBytes.length !== SIGNATURE_BYTES) {
    return false;
  }
  let publicKey;
  try {
    publicKey = createEd25519PublicKeyFromRaw(rawPubBytes);
  } catch {
    return false;
  }
  try {
    return crypto.verify(null, Buffer.from(canonical, "utf8"), publicKey, signatureBytes);
  } catch {
    return false;
  }
}
