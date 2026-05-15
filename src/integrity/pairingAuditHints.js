import { computeNodeIdHash } from "./proofSignature.js";

const NODE_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;
const PUBLIC_KEY_BYTES = 32;

/**
 * Return audit-safe metadata for a rejected proof or pairing payload.
 *
 * `node_id_hash_if_parsed` is only emitted when:
 *   1. node_id_hash matches the 64-hex regex
 *   2. node_public_key decodes to exactly 32 bytes (clean base64 round-trip)
 *   3. sha256(node_public_key_bytes) === node_id_hash
 *
 * This keeps the "only safely-parsed values enter the audit chain" invariant
 * — even on rejection paths where validateProof / validatePairingProof did not
 * complete its full pipeline. Never includes raw key/signature/challenge.
 */
export function safeParsedPairingHints(raw) {
  const hasSignature = typeof raw?.signature === "string" && raw.signature.length > 0;
  const hints = {
    node_id_hash_if_parsed: null,
    has_signature: hasSignature,
  };

  if (typeof raw?.node_public_key !== "string") return hints;
  if (typeof raw?.node_id_hash !== "string") return hints;
  if (!NODE_ID_HASH_PATTERN.test(raw.node_id_hash)) return hints;

  const pubKey = Buffer.from(raw.node_public_key, "base64");
  if (pubKey.toString("base64") !== raw.node_public_key) return hints;
  if (pubKey.length !== PUBLIC_KEY_BYTES) return hints;

  if (computeNodeIdHash(pubKey) !== raw.node_id_hash) return hints;

  hints.node_id_hash_if_parsed = raw.node_id_hash;
  return hints;
}
