import assert from "node:assert/strict";
import test from "node:test";

import {
  FORBIDDEN_LOCAL_FIELD_NAMES,
  containsForbiddenLocalFieldDeep,
} from "../../src/device/forbiddenLocalFields.js";

test("FORBIDDEN_LOCAL_FIELD_NAMES is the union of proof and privacy-audit lists", () => {
  const proofNames = [
    "device_serial",
    "serial_number",
    "mac_address",
    "username",
    "home_directory",
    "process_name",
    "process_id",
    "window_title",
    "raw_window_title",
    "window_handle",
    "hwnd",
    "screenshot",
    "screen_pixels",
    "screen_frame",
    "raw_window",
    "raw_process",
    "raw_process_name",
    "pid",
    "process_identifier",
    "bundle_path",
    "executable_path",
    "file_path",
    "microphone",
    "audio",
    "webcam",
    "typed_content",
    "paste_content",
    "answer_text",
    "answer_content",
  ];
  const privacyAuditExtras = [
    "screen_data",
    "webcam_frame",
    "audio_data",
    "face",
    "face_data",
    "biometric",
    "biometric_data",
    "raw_student_name",
    "student_name",
  ];
  for (const n of proofNames) {
    assert.ok(FORBIDDEN_LOCAL_FIELD_NAMES.includes(n), `missing: ${n}`);
  }
  for (const n of privacyAuditExtras) {
    assert.ok(FORBIDDEN_LOCAL_FIELD_NAMES.includes(n), `missing: ${n}`);
  }
});

test("FORBIDDEN_LOCAL_FIELD_NAMES is frozen and contains no duplicates", () => {
  assert.ok(Object.isFrozen(FORBIDDEN_LOCAL_FIELD_NAMES));
  const unique = new Set(FORBIDDEN_LOCAL_FIELD_NAMES);
  assert.equal(unique.size, FORBIDDEN_LOCAL_FIELD_NAMES.length);
});

test("containsForbiddenLocalFieldDeep finds top-level forbidden key", () => {
  assert.equal(containsForbiddenLocalFieldDeep({ pid: 123 }), "pid");
});

test("containsForbiddenLocalFieldDeep finds deeply-nested forbidden key", () => {
  assert.equal(
    containsForbiddenLocalFieldDeep({ debug: { scanner: { hwnd: "0x123" } } }),
    "hwnd"
  );
});

test("containsForbiddenLocalFieldDeep finds forbidden key inside array", () => {
  assert.equal(
    containsForbiddenLocalFieldDeep({ items: [{ ok: 1 }, { process_name: "x" }] }),
    "process_name"
  );
});

test("containsForbiddenLocalFieldDeep returns null on clean payload", () => {
  assert.equal(
    containsForbiddenLocalFieldDeep({
      session_id: "sess_1",
      capture_excluded_window_count: 0,
      window_fingerprint_hashes: [],
    }),
    null
  );
});

test("containsForbiddenLocalFieldDeep handles null and primitives", () => {
  assert.equal(containsForbiddenLocalFieldDeep(null), null);
  assert.equal(containsForbiddenLocalFieldDeep("hwnd"), null);
  assert.equal(containsForbiddenLocalFieldDeep(42), null);
});

test("containsForbiddenLocalFieldDeep is allowed-hash-suffix aware", () => {
  assert.equal(containsForbiddenLocalFieldDeep({ process_name_hash: "x" }), null);
  assert.equal(containsForbiddenLocalFieldDeep({ window_title_sha256: "x" }), null);
});
