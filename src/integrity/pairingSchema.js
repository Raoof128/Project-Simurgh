// Stage 2.2 v1 pairing schema constants — purely declarative.
// Validation logic lives in pairingValidator.js.
import { FORBIDDEN_FIELDS as PROOF_FORBIDDEN_FIELDS } from "./proofSchema.js";

export const PAIRING_VERSION = "simurgh-pairing-proof-v1";
export const PAIRING_PLATFORM = "macos";

// Same timestamp tolerances as integrity proofs.
export const PAIRING_TIMESTAMP_PAST_MS = 30_000;
export const PAIRING_TIMESTAMP_FUTURE_MS = 5_000;

// Pairing envelope is strict: exactly these 8 top-level fields.
export const PAIRING_REQUIRED_FIELDS = Object.freeze([
  "version",
  "platform",
  "session_id",
  "node_id_hash",
  "node_public_key",
  "challenge",
  "timestamp",
  "signature",
]);

// Same blocklist as integrity proofs — pairing should never carry user content.
export const PAIRING_FORBIDDEN_FIELDS = new Set(PROOF_FORBIDDEN_FIELDS);

// Byte-length rules (decoded bytes, not string lengths).
export const PAIRING_PUBLIC_KEY_BYTES = 32;
export const PAIRING_CHALLENGE_BYTES = 32;
export const PAIRING_SIGNATURE_BYTES = 64;

// Regexes shared with proof validator.
export const PAIRING_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const PAIRING_NODE_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;
