import crypto from "node:crypto";

export const DAEMON_VERSION = "0.4.5";
export const DAEMON_PLATFORM = "macos";
export const DAEMON_CHALLENGE_BYTES = 32;
export const DAEMON_TIMESTAMP_PAST_MS = 30_000;
export const DAEMON_TIMESTAMP_FUTURE_MS = 5_000;

const PROOF_REQUIRED_FIELDS = [
  "type",
  "session_id",
  "exam_id",
  "sequence",
  "timestamp",
  "node_id_hash",
  "daemon_version",
  "platform",
  "capture_excluded_window_count",
  "helper_state",
  "challenge",
  "signature",
];

const FORBIDDEN_FIELDS = [
  "device_serial",
  "serial_number",
  "mac_address",
  "username",
  "home_directory",
  "process_name",
  "window_title",
  "screenshot",
  "screen_frame",
  "raw_window",
  "raw_process",
  "typed_content",
  "paste_content",
  "answer_text",
  "answer_content",
];

const HELPER_STATES = new Set(["healthy", "missing", "stale", "risk_detected", "unknown"]);
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EXAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const NODE_ID_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function fail(reason) {
  return { ok: false, reason };
}

function decodeBase64Url(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) return null;
    return bytes;
  } catch {
    return null;
  }
}

export function canonicaliseDaemonPayload(payload) {
  const copy = {};
  for (const key of Object.keys(payload).sort()) {
    if (key === "signature") continue;
    copy[key] = payload[key];
  }
  return JSON.stringify(copy);
}

export function computeDaemonNodeIdHash(publicKeyBase64Url) {
  const publicKeyBytes = decodeBase64Url(publicKeyBase64Url);
  if (!publicKeyBytes) throw new Error("invalid_public_key");
  return `sha256:${crypto.createHash("sha256").update(publicKeyBytes).digest("hex")}`;
}

export function verifyDaemonSignature(canonicalPayload, publicKeyBase64Url, signatureBase64Url) {
  const publicKeyBytes = decodeBase64Url(publicKeyBase64Url);
  const signatureBytes = decodeBase64Url(signatureBase64Url);
  if (!publicKeyBytes || !signatureBytes) return false;
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: publicKeyBytes, format: "der", type: "spki" });
  } catch {
    return false;
  }
  try {
    return crypto.verify(
      "sha256",
      Buffer.from(canonicalPayload, "utf8"),
      publicKey,
      signatureBytes
    );
  } catch {
    return false;
  }
}

export function validateDaemonProof(
  raw,
  { now = Date.now(), expectedSessionId = null, expectedExamId = null, pairedNode = null } = {}
) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }
  for (const field of PROOF_REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  if (raw.type !== "simurgh.daemon.proof") return fail("invalid_type");
  if (raw.platform !== DAEMON_PLATFORM) return fail("unsupported_platform");
  if (raw.daemon_version !== DAEMON_VERSION) return fail("unsupported_daemon_version");

  if (typeof raw.session_id !== "string" || !SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }
  if (expectedSessionId !== null && raw.session_id !== expectedSessionId) {
    return fail("proof_session_mismatch");
  }
  if (typeof raw.exam_id !== "string" || !EXAM_ID_PATTERN.test(raw.exam_id)) {
    return fail("invalid_exam_id");
  }
  if (expectedExamId !== null && raw.exam_id !== expectedExamId) {
    return fail("proof_exam_mismatch");
  }
  if (!Number.isInteger(raw.sequence) || raw.sequence < 0) return fail("invalid_sequence");

  const ts = Date.parse(raw.timestamp);
  if (typeof raw.timestamp !== "string" || !Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + DAEMON_TIMESTAMP_FUTURE_MS) return fail("proof_in_future");
  if (ts < now - DAEMON_TIMESTAMP_PAST_MS) return fail("proof_stale");

  if (typeof raw.node_id_hash !== "string" || !NODE_ID_HASH_PATTERN.test(raw.node_id_hash)) {
    return fail("invalid_node_id_hash");
  }
  if (!pairedNode) return fail("daemon_node_not_paired");
  if (raw.node_id_hash !== pairedNode.node_id_hash) return fail("daemon_node_mismatch");
  let pairedHash;
  try {
    pairedHash = computeDaemonNodeIdHash(pairedNode.public_key);
  } catch {
    return fail("daemon_public_key_mismatch");
  }
  if (pairedHash !== pairedNode.node_id_hash) {
    return fail("daemon_public_key_mismatch");
  }

  if (
    !Number.isInteger(raw.capture_excluded_window_count) ||
    raw.capture_excluded_window_count < 0 ||
    raw.capture_excluded_window_count > 256
  ) {
    return fail("invalid_capture_excluded_window_count");
  }
  if (typeof raw.helper_state !== "string" || !HELPER_STATES.has(raw.helper_state)) {
    return fail("invalid_helper_state");
  }

  const challengeBytes = decodeBase64Url(raw.challenge);
  if (!challengeBytes || challengeBytes.length !== DAEMON_CHALLENGE_BYTES) {
    return fail("invalid_challenge");
  }
  if (!decodeBase64Url(raw.signature)) return fail("invalid_signature_format");

  const canonical = canonicaliseDaemonPayload(raw);
  if (!verifyDaemonSignature(canonical, pairedNode.public_key, raw.signature)) {
    return fail("invalid_signature");
  }

  return {
    ok: true,
    proof: {
      type: raw.type,
      session_id: raw.session_id,
      exam_id: raw.exam_id,
      sequence: raw.sequence,
      timestamp: raw.timestamp,
      node_id_hash: raw.node_id_hash,
      daemon_version: raw.daemon_version,
      platform: raw.platform,
      capture_excluded_window_count: raw.capture_excluded_window_count,
      helper_state: raw.helper_state,
      challenge: raw.challenge,
      challenge_bytes: challengeBytes,
      challenge_id_hash: `sha256:${crypto.createHash("sha256").update(challengeBytes).digest("hex")}`,
      signature_valid: true,
    },
  };
}

export function validateDaemonPairingPayload(
  raw,
  { now = Date.now(), expectedSessionId = null, expectedExamId = null } = {}
) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("pairing_not_an_object");
  }
  const { node_id_hash, public_key, signature, signed_payload } = raw;
  if (
    signed_payload === null ||
    typeof signed_payload !== "object" ||
    Array.isArray(signed_payload)
  ) {
    return fail("signed_payload_not_an_object");
  }
  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw || field in signed_payload) return fail(`forbidden_field:${field}`);
  }
  for (const field of [
    "type",
    "session_id",
    "exam_id",
    "challenge",
    "timestamp",
    "node_id_hash",
    "daemon_version",
    "platform",
  ]) {
    if (!(field in signed_payload)) return fail(`missing_field:${field}`);
  }
  if (signed_payload.type !== "simurgh.daemon.pair") return fail("invalid_type");
  if (signed_payload.platform !== DAEMON_PLATFORM) return fail("unsupported_platform");
  if (signed_payload.daemon_version !== DAEMON_VERSION) return fail("unsupported_daemon_version");
  if (expectedSessionId !== null && signed_payload.session_id !== expectedSessionId) {
    return fail("pairing_session_mismatch");
  }
  if (expectedExamId !== null && signed_payload.exam_id !== expectedExamId) {
    return fail("pairing_exam_mismatch");
  }
  const ts = Date.parse(signed_payload.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + DAEMON_TIMESTAMP_FUTURE_MS) return fail("pairing_in_future");
  if (ts < now - DAEMON_TIMESTAMP_PAST_MS) return fail("pairing_stale");
  let computedNodeIdHash;
  try {
    computedNodeIdHash = computeDaemonNodeIdHash(public_key);
  } catch {
    return fail("invalid_public_key");
  }
  if (typeof public_key !== "string" || computedNodeIdHash !== node_id_hash) {
    return fail("node_id_hash_mismatch");
  }
  if (signed_payload.node_id_hash !== node_id_hash) return fail("node_id_hash_mismatch");
  if (!verifyDaemonSignature(canonicaliseDaemonPayload(signed_payload), public_key, signature)) {
    return fail("invalid_signature");
  }
  return {
    ok: true,
    payload: {
      node_id_hash,
      public_key,
      signature,
      signed_payload: { ...signed_payload },
      challenge: signed_payload.challenge,
    },
  };
}
