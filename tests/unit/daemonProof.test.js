import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonProof,
  verifyDaemonSignature,
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
    session_id: "sess_daemon",
    exam_id: "exam_daemon",
    sequence: 7,
    timestamp: new Date("2026-05-15T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "0.4.5",
    platform: "macos",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { proof: { ...proof, signature: b64url(signature) }, public_key };
}

test("valid daemon proof is accepted", () => {
  const { proof, public_key } = createSignedProof();
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-15T08:00:02.000Z"),
    expectedSessionId: "sess_daemon",
    expectedExamId: "exam_daemon",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.ok, true);
  assert.equal(result.proof.node_id_hash, proof.node_id_hash);
  assert.equal(result.proof.signature_valid, true);
});

test("invalid signature is rejected", () => {
  const { proof, public_key } = createSignedProof();
  const tampered = { ...proof, helper_state: "missing" };
  const result = validateDaemonProof(tampered, {
    now: Date.parse("2026-05-15T08:00:02.000Z"),
    expectedSessionId: "sess_daemon",
    expectedExamId: "exam_daemon",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.deepEqual(result, { ok: false, reason: "invalid_signature" });
});

test("wrong session and exam are rejected", () => {
  const { proof, public_key } = createSignedProof();
  const pairedNode = { node_id_hash: proof.node_id_hash, public_key };
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T08:00:02.000Z"),
      expectedSessionId: "sess_other",
      expectedExamId: "exam_daemon",
      pairedNode,
    }).reason,
    "proof_session_mismatch"
  );
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T08:00:02.000Z"),
      expectedSessionId: "sess_daemon",
      expectedExamId: "exam_other",
      pairedNode,
    }).reason,
    "proof_exam_mismatch"
  );
});

test("stale and future daemon proofs are rejected", () => {
  const { proof, public_key } = createSignedProof();
  const pairedNode = { node_id_hash: proof.node_id_hash, public_key };
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T08:01:00.000Z"),
      expectedSessionId: "sess_daemon",
      expectedExamId: "exam_daemon",
      pairedNode,
    }).reason,
    "proof_stale"
  );
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T07:59:00.000Z"),
      expectedSessionId: "sess_daemon",
      expectedExamId: "exam_daemon",
      pairedNode,
    }).reason,
    "proof_in_future"
  );
});

test("unknown node and node mismatch are rejected", () => {
  const { proof } = createSignedProof();
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T08:00:02.000Z"),
      expectedSessionId: "sess_daemon",
      expectedExamId: "exam_daemon",
      pairedNode: null,
    }).reason,
    "daemon_node_not_paired"
  );
  const other = createSignedProof();
  assert.equal(
    validateDaemonProof(proof, {
      now: Date.parse("2026-05-15T08:00:02.000Z"),
      expectedSessionId: "sess_daemon",
      expectedExamId: "exam_daemon",
      pairedNode: { node_id_hash: other.proof.node_id_hash, public_key: other.public_key },
    }).reason,
    "daemon_node_mismatch"
  );
});

test("forbidden raw local fields are rejected", () => {
  const { proof, public_key } = createSignedProof({ window_title: "Calculator" });
  const result = validateDaemonProof(proof, {
    now: Date.parse("2026-05-15T08:00:02.000Z"),
    expectedSessionId: "sess_daemon",
    expectedExamId: "exam_daemon",
    pairedNode: { node_id_hash: proof.node_id_hash, public_key },
  });
  assert.equal(result.reason, "forbidden_field:window_title");
});

test("raw P-256 signature verifier accepts canonical bytes", () => {
  const { proof, public_key } = createSignedProof();
  const signature = proof.signature;
  const unsigned = { ...proof };
  delete unsigned.signature;
  assert.equal(
    verifyDaemonSignature(canonicaliseDaemonPayload(unsigned), public_key, signature),
    true
  );
});
