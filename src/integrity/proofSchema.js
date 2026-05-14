// Stage 2 integrity proof schema and validator.
//
// A proof is a signed envelope submitted by a Local Integrity Node. It binds a
// browser session to observed device-level signals without collecting invasive
// content. The signature field is a placeholder for Stage 2.0 — hardware or
// key-based signing is a later milestone. For now the server validates the
// structure and freshness of the proof and records the submission in the audit chain.
//
// Privacy invariants (enforced here):
//   - no screen_pixels, screenshots, webcam_frames, microphone_audio
//   - no typed_answer, paste_content
//   - no raw_process_names or raw_window_titles unless explicitly allowlisted
//   - no hardware_serial, biometrics, or student_face_data
//
// This module is intentionally Stage 2 scaffold only.
// It does not replace Stage 1 telemetry or scoring.

export const PROOF_VERSION = "2.0.0-scaffold";

// Allowed capability strings. Anything outside this set is stripped.
export const ALLOWED_CAPABILITIES = new Set([
  "display_affinity_scan",
  "local_log_hash",
  "node_heartbeat",
  "clock_integrity_check",
]);

// Known node state values.
export const NODE_STATES = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNAVAILABLE: "unavailable",
});

// Maximum timestamp skew accepted for a proof (30 s).
const PROOF_SKEW_MS = 30_000;

// Required top-level fields.
const REQUIRED_FIELDS = [
  "session_id",
  "nonce",
  "issued_at",
  "capabilities",
  "privacy_mode",
  "signature",
];

// Forbidden data fields — must never appear in a submitted proof body.
const FORBIDDEN_FIELDS = new Set([
  "screen_pixels",
  "screenshot",
  "webcam_frame",
  "microphone_audio",
  "typed_answer",
  "paste_content",
  "raw_process_names",
  "raw_window_titles",
  "hardware_serial",
  "biometric",
  "student_face",
]);

/**
 * Validate and normalise an incoming proof payload.
 * Returns { ok: true, proof } or { ok: false, reason }.
 *
 * @param {unknown} raw - raw request body
 * @param {number} now - current epoch ms (injectable for tests)
 */
export function validateProof(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "proof_not_an_object" };
  }

  // Check for forbidden fields anywhere in the top-level object.
  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw) {
      return { ok: false, reason: `forbidden_field:${field}` };
    }
  }

  // Required fields present?
  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return { ok: false, reason: `missing_field:${field}` };
    }
  }

  // session_id — alphanumeric + hyphen/underscore, max 64 chars
  const sessionId = String(raw.session_id).slice(0, 128);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(sessionId)) {
    return { ok: false, reason: "invalid_session_id" };
  }

  // nonce — non-empty string, max 128 chars (API-issued opaque value)
  const nonce = String(raw.nonce).slice(0, 256);
  if (nonce.length < 8 || nonce.length > 128) {
    return { ok: false, reason: "invalid_nonce" };
  }

  // issued_at — ISO8601 string or epoch ms number
  let issuedAtMs;
  if (typeof raw.issued_at === "number") {
    issuedAtMs = raw.issued_at;
  } else {
    issuedAtMs = Date.parse(String(raw.issued_at));
  }
  if (!Number.isFinite(issuedAtMs)) {
    return { ok: false, reason: "invalid_issued_at" };
  }
  if (Math.abs(now - issuedAtMs) > PROOF_SKEW_MS) {
    return { ok: false, reason: issuedAtMs > now ? "proof_in_future" : "proof_stale" };
  }

  // capabilities — array of known strings
  if (!Array.isArray(raw.capabilities)) {
    return { ok: false, reason: "capabilities_not_array" };
  }
  const capabilities = raw.capabilities
    .map((c) => String(c).slice(0, 64))
    .filter((c) => ALLOWED_CAPABILITIES.has(c));

  // privacy_mode — must be "metadata_only"
  if (raw.privacy_mode !== "metadata_only") {
    return { ok: false, reason: "invalid_privacy_mode" };
  }

  // risk_signals — optional object; strip any forbidden sub-fields
  let riskSignals = null;
  if (
    raw.risk_signals &&
    typeof raw.risk_signals === "object" &&
    !Array.isArray(raw.risk_signals)
  ) {
    riskSignals = {
      capture_excluded_window_count: Math.max(
        0,
        Math.min(10000, Number(raw.risk_signals.capture_excluded_window_count) || 0)
      ),
      node_state: Object.values(NODE_STATES).includes(raw.risk_signals.node_state)
        ? raw.risk_signals.node_state
        : NODE_STATES.UNAVAILABLE,
    };
  }

  // local_log_root — optional sha256 hash string
  let localLogRoot = null;
  if (typeof raw.local_log_root === "string") {
    const r = raw.local_log_root.trim().slice(0, 128);
    if (/^sha256:[0-9a-f]{64}$/i.test(r)) localLogRoot = r;
  }

  // signature — placeholder: non-empty string, max 512 chars
  // Stage 2.0 accepts any non-empty string. Actual cryptographic verification
  // is a later milestone when node key infrastructure is defined.
  const signature = String(raw.signature).slice(0, 512);
  if (signature.length === 0) {
    return { ok: false, reason: "missing_signature" };
  }

  return {
    ok: true,
    proof: {
      session_id: sessionId,
      nonce,
      issued_at: new Date(issuedAtMs).toISOString(),
      capabilities,
      privacy_mode: "metadata_only",
      risk_signals: riskSignals,
      local_log_root: localLogRoot,
      signature,
      proof_version: PROOF_VERSION,
      received_at: new Date(now).toISOString(),
    },
  };
}
