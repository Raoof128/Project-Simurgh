import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonProof,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function createSignedProof(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_scanner",
    exam_id: "exam_scanner",
    sequence: 8,
    timestamp: new Date("2026-05-16T00:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "0.4.7",
    platform: "macos",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date("2026-05-16T00:00:00.000Z").toISOString(),
    scan_duration_ms: 8,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 12,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { proof: { ...proof, signature: b64url(signature) }, public_key };
}

test("valid daemon proof with zero-count scanner fields is accepted", () => {
  const { proof, public_key } = createSignedProof();
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-16T00:00:02.000Z"),
    expectedSessionId: "sess_scanner",
    expectedExamId: "exam_scanner",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });

  assert.equal(result.ok, true);
  assert.equal(result.proof.scanner_state, "healthy");
  assert.equal(result.proof.visible_window_count, 12);
  assert.equal(result.proof.privacy_mode, "metadata_only");
});

test("capture-excluded scanner proof is accepted with signed scanner fields", () => {
  const { proof, public_key } = createSignedProof({
    capture_excluded_window_count: 1,
    suspicious_window_count: 1,
    scanner_state: "risk_detected",
    window_fingerprint_hashes: ["sha256:" + "a".repeat(64)],
  });
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-16T00:00:02.000Z"),
    expectedSessionId: "sess_scanner",
    expectedExamId: "exam_scanner",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });

  assert.equal(result.ok, true);
  assert.equal(result.proof.capture_excluded_window_count, 1);
  assert.equal(result.proof.scanner_state, "risk_detected");
  assert.deepEqual(result.proof.window_fingerprint_hashes, ["sha256:" + "a".repeat(64)]);
});

test("raw local scanner fields are rejected before signature trust", () => {
  for (const field of [
    "process_name",
    "raw_process_name",
    "window_title",
    "raw_window_title",
    "pid",
  ]) {
    const { proof, public_key } = createSignedProof({ [field]: field === "pid" ? 123 : "raw" });
    const result = validateDaemonProof(proof, {
      now: Date.parse("2026-05-16T00:00:02.000Z"),
      expectedSessionId: "sess_scanner",
      expectedExamId: "exam_scanner",
      pairedNode: { node_id_hash: proof.node_id_hash, public_key },
    });
    assert.equal(result.reason, `forbidden_field:${field}`);
  }
});

test("scanner field tampering invalidates the daemon proof signature", () => {
  const { proof, public_key } = createSignedProof();
  const tampered = { ...proof, scanner_state: "risk_detected" };
  const result = validateDaemonProof(tampered, {
    now: Date.parse("2026-05-16T00:00:02.000Z"),
    expectedSessionId: "sess_scanner",
    expectedExamId: "exam_scanner",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });

  assert.equal(result.reason, "invalid_signature");
});
