import crypto from "node:crypto";

export const DAEMON_VERSION = "0.4.7";
export const DAEMON_PLATFORM = "macos";
export const DAEMON_CHALLENGE_BYTES = 32;
export const DAEMON_TIMESTAMP_PAST_MS = 30_000;
export const DAEMON_TIMESTAMP_FUTURE_MS = 5_000;
const SUPPORTED_DAEMON_VERSIONS = new Set(["0.4.5", "0.4.7"]);

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
  "raw_window_title",
  "screenshot",
  "screen_pixels",
  "screen_frame",
  "raw_window",
  "raw_process",
  "raw_process_name",
  "pid",
  "process_identifier",
  "bundle_path",
  "file_path",
  "audio",
  "typed_content",
  "paste_content",
  "answer_text",
  "answer_content",
];

const HELPER_STATES = new Set(["healthy", "missing", "stale", "risk_detected", "unknown"]);
const SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "scanner_unavailable",
  "permission_denied",
  "scan_error",
  "unsupported_macos_version",
]);
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EXAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const NODE_ID_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const FINGERPRINT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

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

function isNonNegativeInt(value, max = 100_000) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function validateScannerFields(raw) {
  const scannerKeys = [
    "scanner_state",
    "scanner_version",
    "scan_timestamp",
    "scan_duration_ms",
    "scan_error_count",
    "suspicious_window_count",
    "visible_window_count",
    "privacy_mode",
    "window_fingerprint_hashes",
  ];
  const hasScannerFields = scannerKeys.some((key) => key in raw);
  if (!hasScannerFields) {
    return {
      ok: true,
      fields: {
        scanner_state: raw.capture_excluded_window_count > 0 ? "risk_detected" : "healthy",
        scanner_version: null,
        scan_timestamp: null,
        scan_duration_ms: null,
        scan_error_count: 0,
        suspicious_window_count: raw.capture_excluded_window_count,
        visible_window_count: null,
        privacy_mode: "metadata_only",
        window_fingerprint_hashes: [],
      },
    };
  }
  if (typeof raw.scanner_state !== "string" || !SCANNER_STATES.has(raw.scanner_state)) {
    return fail("invalid_scanner_state");
  }
  if (typeof raw.scanner_version !== "string" || raw.scanner_version !== "2.5.0") {
    return fail("invalid_scanner_version");
  }
  const scanTs = Date.parse(raw.scan_timestamp);
  if (typeof raw.scan_timestamp !== "string" || !Number.isFinite(scanTs)) {
    return fail("invalid_scan_timestamp");
  }
  if (!isNonNegativeInt(raw.scan_duration_ms, 60_000)) {
    return fail("invalid_scan_duration_ms");
  }
  if (!isNonNegativeInt(raw.scan_error_count, 256)) return fail("invalid_scan_error_count");
  if (!isNonNegativeInt(raw.suspicious_window_count, 256)) {
    return fail("invalid_suspicious_window_count");
  }
  if (!isNonNegativeInt(raw.visible_window_count, 10_000)) {
    return fail("invalid_visible_window_count");
  }
  if (raw.privacy_mode !== "metadata_only") return fail("invalid_privacy_mode");
  if (!Array.isArray(raw.window_fingerprint_hashes) || raw.window_fingerprint_hashes.length > 256) {
    return fail("invalid_window_fingerprint_hashes");
  }
  for (const hash of raw.window_fingerprint_hashes) {
    if (typeof hash !== "string" || !FINGERPRINT_HASH_PATTERN.test(hash)) {
      return fail("invalid_window_fingerprint_hashes");
    }
  }
  if (raw.suspicious_window_count < raw.capture_excluded_window_count) {
    return fail("invalid_suspicious_window_count");
  }
  return {
    ok: true,
    fields: {
      scanner_state: raw.scanner_state,
      scanner_version: raw.scanner_version,
      scan_timestamp: raw.scan_timestamp,
      scan_duration_ms: raw.scan_duration_ms,
      scan_error_count: raw.scan_error_count,
      suspicious_window_count: raw.suspicious_window_count,
      visible_window_count: raw.visible_window_count,
      privacy_mode: raw.privacy_mode,
      window_fingerprint_hashes: [...raw.window_fingerprint_hashes],
    },
  };
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
  if (!SUPPORTED_DAEMON_VERSIONS.has(raw.daemon_version)) {
    return fail("unsupported_daemon_version");
  }

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
  const scannerValidation = validateScannerFields(raw);
  if (!scannerValidation.ok) return scannerValidation;
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
      ...scannerValidation.fields,
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
  if (!SUPPORTED_DAEMON_VERSIONS.has(signed_payload.daemon_version)) {
    return fail("unsupported_daemon_version");
  }
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
