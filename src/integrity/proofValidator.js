import { canonicaliseProofPayload } from "./proofCanonicalise.js";
import { verifyProofSignature, computeNodeIdHash } from "./proofSignature.js";
import {
  PROOF_VERSION,
  PROOF_PLATFORM,
  PROOF_PRIVACY_MODE,
  REQUIRED_FIELDS,
  FORBIDDEN_FIELDS,
  CAPABILITY_KEYS,
  SIGNAL_KEYS,
  HELPER_STATUS_VALUES,
  PUBLIC_KEY_BYTES,
  SIGNATURE_BYTES,
  NONCE_BYTES_MIN,
  NONCE_BYTES_MAX,
  TIMESTAMP_PAST_MS,
  TIMESTAMP_FUTURE_MS,
  SESSION_ID_PATTERN,
  NODE_ID_HASH_PATTERN,
} from "./proofSchema.js";

function fail(reason) {
  return { ok: false, reason };
}

function tryDecodeBase64(s) {
  if (typeof s !== "string") return null;
  const buf = Buffer.from(s, "base64");
  // Re-encode to verify we got clean base64 input (Buffer.from is otherwise permissive).
  if (buf.toString("base64") !== s) return null;
  return buf;
}

function isNonNegativeInt(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function validateCapabilities(caps) {
  if (caps === null || typeof caps !== "object" || Array.isArray(caps)) return false;
  const keys = Object.keys(caps);
  if (keys.length !== CAPABILITY_KEYS.length) return false;
  for (const k of CAPABILITY_KEYS) {
    if (!(k in caps)) return false;
    if (typeof caps[k] !== "boolean") return false;
  }
  return true;
}

function validateSignals(signals) {
  if (signals === null || typeof signals !== "object" || Array.isArray(signals)) return false;
  const keys = Object.keys(signals);
  if (keys.length !== Object.keys(SIGNAL_KEYS).length) return false;
  for (const [k, type] of Object.entries(SIGNAL_KEYS)) {
    if (!(k in signals)) return false;
    if (type === "nonNegativeInt" && !isNonNegativeInt(signals[k])) return false;
    if (type === "helperStatusEnum" && !HELPER_STATUS_VALUES.includes(signals[k])) return false;
  }
  return true;
}

/**
 * Validate a Stage 2.1 macOS integrity proof.
 *
 * Returns:
 *   { ok: true, proof }                — proof is the accepted shape (includes raw nonce_bytes Buffer)
 *   { ok: false, reason: "<code>" }    — see spec §"Server Validation Flow"
 *
 * This validator does NOT check nonce replay or node continuity.
 * Those are downstream responsibilities of nonceGuard and integrityState.
 */
export function validateProof(raw, { now = Date.now() } = {}) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  if (raw.version !== PROOF_VERSION) return fail("unsupported_version");
  if (raw.platform !== PROOF_PLATFORM) return fail("unsupported_platform");
  if (raw.privacy_mode !== PROOF_PRIVACY_MODE) return fail("invalid_privacy_mode");

  if (typeof raw.session_id !== "string" || !SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }

  if (typeof raw.timestamp !== "string") return fail("invalid_timestamp");
  const ts = Date.parse(raw.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + TIMESTAMP_FUTURE_MS) return fail("proof_in_future");
  if (ts < now - TIMESTAMP_PAST_MS) return fail("proof_stale");

  if (!validateCapabilities(raw.capabilities)) return fail("invalid_capabilities");
  if (!validateSignals(raw.signals)) return fail("invalid_signals");

  if (typeof raw.node_public_key !== "string") return fail("invalid_public_key");
  const pubKey = tryDecodeBase64(raw.node_public_key);
  if (!pubKey || pubKey.length !== PUBLIC_KEY_BYTES) return fail("invalid_public_key");

  if (typeof raw.node_id_hash !== "string" || !NODE_ID_HASH_PATTERN.test(raw.node_id_hash)) {
    return fail("node_id_hash_mismatch");
  }
  if (raw.node_id_hash !== computeNodeIdHash(pubKey)) return fail("node_id_hash_mismatch");

  if (typeof raw.nonce !== "string") return fail("invalid_nonce");
  const nonceBytes = tryDecodeBase64(raw.nonce);
  if (!nonceBytes || nonceBytes.length < NONCE_BYTES_MIN || nonceBytes.length > NONCE_BYTES_MAX) {
    return fail("invalid_nonce");
  }

  if (typeof raw.signature !== "string") return fail("invalid_signature_format");
  const sigBytes = tryDecodeBase64(raw.signature);
  if (!sigBytes || sigBytes.length !== SIGNATURE_BYTES) return fail("invalid_signature_format");

  const canonical = canonicaliseProofPayload(raw);
  if (!verifyProofSignature(canonical, pubKey, sigBytes)) return fail("invalid_signature");

  const accepted = {
    version: raw.version,
    platform: raw.platform,
    session_id: raw.session_id,
    node_id_hash: raw.node_id_hash,
    node_public_key: raw.node_public_key,
    nonce: raw.nonce,
    nonce_bytes: nonceBytes,
    timestamp: raw.timestamp,
    capabilities: { ...raw.capabilities },
    signals: { ...raw.signals },
    privacy_mode: raw.privacy_mode,
    signature: raw.signature,
  };
  return { ok: true, proof: accepted };
}
