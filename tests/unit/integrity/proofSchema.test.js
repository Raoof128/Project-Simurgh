// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
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
} from "../../../src/integrity/proofSchema.js";

describe("proofSchema constants", () => {
  test("version, platform, privacy_mode are locked v1 values", () => {
    assert.equal(PROOF_VERSION, "simurgh-integrity-proof-v1");
    assert.equal(PROOF_PLATFORM, "macos");
    assert.equal(PROOF_PRIVACY_MODE, "metadata_only");
  });

  test("REQUIRED_FIELDS lists all 11 v1 top-level fields", () => {
    assert.equal(REQUIRED_FIELDS.length, 11);
    for (const f of [
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
    ]) {
      assert.ok(REQUIRED_FIELDS.includes(f), `missing required: ${f}`);
    }
  });

  test("FORBIDDEN_FIELDS includes all Section 2 entries", () => {
    for (const f of [
      "screen_pixels",
      "screenshot",
      "screen_frame",
      "webcam",
      "audio",
      "microphone",
      "typed_answer",
      "paste_content",
      "face_embedding",
      "window_title",
      "process_name",
      "raw_student_name",
      "biometric",
    ]) {
      assert.ok(FORBIDDEN_FIELDS.has(f), `missing forbidden: ${f}`);
    }
  });

  test("CAPABILITY_KEYS lists exactly 4 keys", () => {
    assert.deepEqual([...CAPABILITY_KEYS].sort(), [
      "helper_bridge",
      "screencapturekit_available",
      "sharing_state_scan",
      "window_enumeration",
    ]);
  });

  test("SIGNAL_KEYS lists exactly 4 typed entries", () => {
    assert.deepEqual(Object.keys(SIGNAL_KEYS).sort(), [
      "capture_excluded_window_count",
      "helper_status",
      "node_uptime_ms",
      "window_count",
    ]);
  });

  test("HELPER_STATUS_VALUES enumerates connected/stale/not_configured", () => {
    assert.deepEqual([...HELPER_STATUS_VALUES].sort(), ["connected", "not_configured", "stale"]);
  });

  test("byte-length constants are 32/64/12/64", () => {
    assert.equal(PUBLIC_KEY_BYTES, 32);
    assert.equal(SIGNATURE_BYTES, 64);
    assert.equal(NONCE_BYTES_MIN, 12);
    assert.equal(NONCE_BYTES_MAX, 64);
  });

  test("timestamp windows are 30s past, 5s future", () => {
    assert.equal(TIMESTAMP_PAST_MS, 30_000);
    assert.equal(TIMESTAMP_FUTURE_MS, 5_000);
  });

  test("regex patterns match expected formats", () => {
    assert.ok(SESSION_ID_PATTERN.test("sess_abc123"));
    assert.ok(!SESSION_ID_PATTERN.test("../etc/passwd"));
    assert.ok(NODE_ID_HASH_PATTERN.test("a".repeat(64)));
    assert.ok(!NODE_ID_HASH_PATTERN.test("A".repeat(64)));
  });
});
