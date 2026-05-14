import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateProof, PROOF_VERSION, NODE_STATES } from "../../../src/integrity/proofSchema.js";

const NOW = Date.now();

// Minimal valid proof factory
function validProof(overrides = {}) {
  return {
    session_id: "sess_abc123",
    nonce: "api-nonce-abcdef12",
    issued_at: new Date(NOW).toISOString(),
    capabilities: ["display_affinity_scan"],
    privacy_mode: "metadata_only",
    signature: "placeholder-sig-xyz",
    ...overrides,
  };
}

describe("validateProof", () => {
  test("accepts a valid minimal proof", () => {
    const result = validateProof(validProof(), NOW);
    assert.equal(result.ok, true);
    assert.equal(result.proof.session_id, "sess_abc123");
    assert.equal(result.proof.privacy_mode, "metadata_only");
    assert.equal(result.proof.proof_version, PROOF_VERSION);
    assert.ok(result.proof.received_at);
  });

  test("rejects null / non-object input", () => {
    assert.equal(validateProof(null, NOW).reason, "proof_not_an_object");
    assert.equal(validateProof("string", NOW).reason, "proof_not_an_object");
    assert.equal(validateProof([], NOW).reason, "proof_not_an_object");
  });

  test("rejects missing required fields", () => {
    for (const field of [
      "session_id",
      "nonce",
      "issued_at",
      "capabilities",
      "privacy_mode",
      "signature",
    ]) {
      const proof = validProof();
      delete proof[field];
      const result = validateProof(proof, NOW);
      assert.equal(result.ok, false, `Expected rejection for missing: ${field}`);
      assert.match(result.reason, new RegExp(`missing_field:${field}|invalid_`));
    }
  });

  test("rejects stale issued_at", () => {
    const staleProof = validProof({ issued_at: new Date(NOW - 60_000).toISOString() });
    const result = validateProof(staleProof, NOW);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "proof_stale");
  });

  test("rejects future issued_at", () => {
    const futureProof = validProof({ issued_at: new Date(NOW + 60_000).toISOString() });
    const result = validateProof(futureProof, NOW);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "proof_in_future");
  });

  test("accepts issued_at as epoch ms number", () => {
    const result = validateProof(validProof({ issued_at: NOW }), NOW);
    assert.equal(result.ok, true);
  });

  test("rejects privacy_mode other than metadata_only", () => {
    const result = validateProof(validProof({ privacy_mode: "full_capture" }), NOW);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_privacy_mode");
  });

  test("strips unknown capabilities, keeps known ones", () => {
    const result = validateProof(
      validProof({
        capabilities: ["display_affinity_scan", "unknown_capability", "local_log_hash"],
      }),
      NOW
    );
    assert.equal(result.ok, true);
    assert.deepEqual(result.proof.capabilities, ["display_affinity_scan", "local_log_hash"]);
  });

  test("accepts empty capabilities array", () => {
    const result = validateProof(validProof({ capabilities: [] }), NOW);
    assert.equal(result.ok, true);
    assert.deepEqual(result.proof.capabilities, []);
  });

  test("rejects forbidden fields — screen_pixels", () => {
    const result = validateProof(validProof({ screen_pixels: "base64data" }), NOW);
    assert.equal(result.ok, false);
    assert.match(result.reason, /forbidden_field:screen_pixels/);
  });

  test("rejects forbidden fields — typed_answer", () => {
    const result = validateProof(validProof({ typed_answer: "my exam answer" }), NOW);
    assert.equal(result.ok, false);
    assert.match(result.reason, /forbidden_field:typed_answer/);
  });

  test("rejects forbidden fields — paste_content", () => {
    const result = validateProof(validProof({ paste_content: "pasted text" }), NOW);
    assert.equal(result.ok, false);
    assert.match(result.reason, /forbidden_field:paste_content/);
  });

  test("rejects forbidden fields — webcam_frame", () => {
    const result = validateProof(validProof({ webcam_frame: "base64" }), NOW);
    assert.equal(result.ok, false);
  });

  test("normalises risk_signals — valid node_state", () => {
    const result = validateProof(
      validProof({
        risk_signals: {
          capture_excluded_window_count: 2,
          node_state: NODE_STATES.HEALTHY,
        },
      }),
      NOW
    );
    assert.equal(result.ok, true);
    assert.equal(result.proof.risk_signals.capture_excluded_window_count, 2);
    assert.equal(result.proof.risk_signals.node_state, "healthy");
  });

  test("normalises risk_signals — unknown node_state falls back to unavailable", () => {
    const result = validateProof(
      validProof({ risk_signals: { node_state: "hacked", capture_excluded_window_count: 0 } }),
      NOW
    );
    assert.equal(result.ok, true);
    assert.equal(result.proof.risk_signals.node_state, NODE_STATES.UNAVAILABLE);
  });

  test("accepts valid local_log_root sha256 hash", () => {
    const hash = "sha256:" + "a".repeat(64);
    const result = validateProof(validProof({ local_log_root: hash }), NOW);
    assert.equal(result.ok, true);
    assert.equal(result.proof.local_log_root, hash);
  });

  test("drops malformed local_log_root", () => {
    const result = validateProof(validProof({ local_log_root: "not-a-hash" }), NOW);
    assert.equal(result.ok, true);
    assert.equal(result.proof.local_log_root, null);
  });

  test("rejects empty signature", () => {
    const result = validateProof(validProof({ signature: "" }), NOW);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_signature");
  });

  test("rejects invalid session_id format", () => {
    const result = validateProof(validProof({ session_id: "../../etc/passwd" }), NOW);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_session_id");
  });
});
