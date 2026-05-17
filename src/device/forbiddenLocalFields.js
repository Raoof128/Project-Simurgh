// Single source of truth for forbidden raw local field names across the
// Stage 2.7 cross-platform Device Shield surface. Consumed by:
//  - src/device/daemonProof.js  (daemon proof + pairing payload rejection)
//  - tools/privacy-audit.mjs    (JSON-on-disk scanner)
//  - tests/security/*           (negative-test surface)
//
// Hash-suffixed counterparts (e.g. node_id_hash, window_title_sha256) are
// explicitly allowed — they are the privacy-preserving alternatives.

export const FORBIDDEN_LOCAL_FIELD_NAMES = Object.freeze([
  // Identity / device
  "device_serial",
  "serial_number",
  "mac_address",
  "username",
  "home_directory",
  // Process / window enumeration
  "process_name",
  "raw_process_name",
  "process_id",
  "process_identifier",
  "pid",
  "window_title",
  "raw_window_title",
  "window_handle",
  "hwnd",
  "raw_window",
  "raw_process",
  // Filesystem paths
  "bundle_path",
  "executable_path",
  "file_path",
  // Pixel / frame
  "screenshot",
  "screen_pixels",
  "screen_frame",
  "screen_data",
  // Webcam / mic
  "webcam",
  "webcam_frame",
  "audio",
  "audio_data",
  "microphone",
  // Biometric
  "face",
  "face_data",
  "biometric",
  "biometric_data",
  // Identity (student-facing)
  "raw_student_name",
  "student_name",
  // Content
  "typed_content",
  "paste_content",
  "answer_text",
  "answer_content",
]);

const ALLOWED_HASH_SUFFIXES = ["_hash", "_sha256", "_digest"];

function isAllowedHashField(key) {
  return ALLOWED_HASH_SUFFIXES.some((s) => key.endsWith(s));
}

export function containsForbiddenLocalFieldDeep(value) {
  if (value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = containsForbiddenLocalFieldDeep(item);
      if (nested) return nested;
    }
    return null;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_LOCAL_FIELD_NAMES.includes(key) && !isAllowedHashField(key)) {
      return key;
    }
    const nested = containsForbiddenLocalFieldDeep(nestedValue);
    if (nested) return nested;
  }
  return null;
}
