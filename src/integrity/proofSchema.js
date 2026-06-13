// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 2.1 v1 proof schema constants — purely declarative.
// Validation logic lives in proofValidator.js.

export const PROOF_VERSION = "simurgh-integrity-proof-v1";
export const PROOF_PLATFORM = "macos";
export const PROOF_PRIVACY_MODE = "metadata_only";

// Timestamp window: 30 s past tolerance, 5 s future tolerance.
export const TIMESTAMP_PAST_MS = 30_000;
export const TIMESTAMP_FUTURE_MS = 5_000;

// Top-level required fields. Each missing field is rejected as missing_field:<name>.
export const REQUIRED_FIELDS = Object.freeze([
  "version",
  "platform",
  "session_id",
  "node_id_hash",
  "node_public_key",
  "nonce",
  "timestamp",
  "capabilities",
  "signals",
  "privacy_mode",
  "signature",
]);

// Forbidden top-level fields. Rejection (not stripping).
export const FORBIDDEN_FIELDS = new Set([
  "screen_pixels",
  "screenshot",
  "screen_frame",
  "screen_recording",
  "webcam",
  "webcam_frame",
  "audio",
  "microphone",
  "microphone_audio",
  "typed_answer",
  "paste_content",
  "face_embedding",
  "window_title",
  "process_name",
  "raw_process_names",
  "raw_window_titles",
  "raw_student_name",
  "student_name",
  "hardware_serial",
  "biometric",
  "student_face",
]);

// Exactly these capability keys, all boolean.
export const CAPABILITY_KEYS = Object.freeze([
  "screencapturekit_available",
  "window_enumeration",
  "sharing_state_scan",
  "helper_bridge",
]);

// Exactly these signal keys with their accepted types.
export const SIGNAL_KEYS = Object.freeze({
  node_uptime_ms: "nonNegativeInt",
  window_count: "nonNegativeInt",
  capture_excluded_window_count: "nonNegativeInt",
  helper_status: "helperStatusEnum",
});

export const HELPER_STATUS_VALUES = Object.freeze(["connected", "stale", "not_configured"]);

// Byte-length rules — checked against the base64-decoded value, not string length.
export const PUBLIC_KEY_BYTES = 32;
export const SIGNATURE_BYTES = 64;
export const NONCE_BYTES_MIN = 12;
export const NONCE_BYTES_MAX = 64;

// Session ID format used by Stage 1 — must also match req.sessionTokenSessionId at the route.
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const NODE_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;
