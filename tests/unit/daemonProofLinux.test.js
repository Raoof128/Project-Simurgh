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

function createSignedLinuxProof(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const public_key = b64url(publicKey.export({ format: "der", type: "spki" }));
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_linux",
    exam_id: "exam_linux",
    sequence: 1,
    timestamp: new Date("2026-05-17T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
    display_server: "x11",
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scanner_reason: "none",
    coverage: "x11_full",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    privacy_mode: "metadata_only",
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { proof: { ...proof, signature: b64url(signature) }, public_key };
}

test("valid Linux daemon proof is accepted", () => {
  const { proof, public_key } = createSignedLinuxProof();
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("Linux proof with mixed state (healthy + non-none reason) is rejected", () => {
  const { proof, public_key } = createSignedLinuxProof({
    scanner_state: "healthy",
    scanner_reason: "non_local_display",
  });
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_linux_scanner_reason");
});
