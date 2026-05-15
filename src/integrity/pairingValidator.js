import { canonicalisePairingPayload } from "./pairingCanonicalise.js";
import { verifyProofSignature, computeNodeIdHash } from "./proofSignature.js";
import {
  PAIRING_VERSION,
  PAIRING_PLATFORM,
  PAIRING_REQUIRED_FIELDS,
  PAIRING_FORBIDDEN_FIELDS,
  PAIRING_PUBLIC_KEY_BYTES,
  PAIRING_CHALLENGE_BYTES,
  PAIRING_SIGNATURE_BYTES,
  PAIRING_TIMESTAMP_PAST_MS,
  PAIRING_TIMESTAMP_FUTURE_MS,
  PAIRING_SESSION_ID_PATTERN,
  PAIRING_NODE_ID_HASH_PATTERN,
} from "./pairingSchema.js";

function fail(reason) {
  return { ok: false, reason };
}

function tryDecodeBase64(s) {
  if (typeof s !== "string") return null;
  const buf = Buffer.from(s, "base64");
  if (buf.toString("base64") !== s) return null;
  return buf;
}

export function validatePairingProof(raw, { now = Date.now(), expectedSessionId = null } = {}) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  for (const field of PAIRING_FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }

  const keys = Object.keys(raw);
  for (const k of keys) {
    if (!PAIRING_REQUIRED_FIELDS.includes(k)) return fail(`unknown_field:${k}`);
  }
  for (const field of PAIRING_REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  if (raw.version !== PAIRING_VERSION) return fail("unsupported_version");
  if (raw.platform !== PAIRING_PLATFORM) return fail("unsupported_platform");

  if (typeof raw.session_id !== "string" || !PAIRING_SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }
  if (expectedSessionId !== null && raw.session_id !== expectedSessionId) {
    return fail("proof_session_mismatch");
  }

  if (typeof raw.timestamp !== "string") return fail("invalid_timestamp");
  const ts = Date.parse(raw.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + PAIRING_TIMESTAMP_FUTURE_MS) return fail("pairing_in_future");
  if (ts < now - PAIRING_TIMESTAMP_PAST_MS) return fail("pairing_stale");

  const pubKey = tryDecodeBase64(raw.node_public_key);
  if (!pubKey || pubKey.length !== PAIRING_PUBLIC_KEY_BYTES) return fail("invalid_public_key");

  if (
    typeof raw.node_id_hash !== "string" ||
    !PAIRING_NODE_ID_HASH_PATTERN.test(raw.node_id_hash)
  ) {
    return fail("node_id_hash_mismatch");
  }
  if (raw.node_id_hash !== computeNodeIdHash(pubKey)) return fail("node_id_hash_mismatch");

  const challengeBytes = tryDecodeBase64(raw.challenge);
  if (!challengeBytes || challengeBytes.length !== PAIRING_CHALLENGE_BYTES) {
    return fail("invalid_challenge_format");
  }

  const sigBytes = tryDecodeBase64(raw.signature);
  if (!sigBytes || sigBytes.length !== PAIRING_SIGNATURE_BYTES) {
    return fail("invalid_signature_format");
  }

  const canonical = canonicalisePairingPayload(raw);
  if (!verifyProofSignature(canonical, pubKey, sigBytes)) return fail("invalid_signature");

  return {
    ok: true,
    payload: {
      version: raw.version,
      platform: raw.platform,
      session_id: raw.session_id,
      node_id_hash: raw.node_id_hash,
      node_public_key: raw.node_public_key,
      challenge: raw.challenge,
      challenge_bytes: challengeBytes,
      timestamp: raw.timestamp,
      signature: raw.signature,
    },
  };
}
