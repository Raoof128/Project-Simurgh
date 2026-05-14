import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateProof } from "../../../src/integrity/proofValidator.js";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";
import { computeNodeIdHash } from "../../../src/integrity/proofSignature.js";

const NOW = Date.parse("2026-05-14T12:00:00.000Z");

function freshSignedProof(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const base = {
    version: "simurgh-integrity-proof-v1",
    platform: "macos",
    session_id: "sess_abc",
    node_id_hash: computeNodeIdHash(rawPub),
    node_public_key: rawPub.toString("base64"),
    nonce: Buffer.alloc(16, 0xab).toString("base64"),
    timestamp: new Date(NOW).toISOString(),
    capabilities: {
      screencapturekit_available: false,
      window_enumeration: false,
      sharing_state_scan: false,
      helper_bridge: false,
    },
    signals: {
      node_uptime_ms: 0,
      window_count: 0,
      capture_excluded_window_count: 0,
      helper_status: "not_configured",
    },
    privacy_mode: "metadata_only",
    ...overrides,
  };
  const canonical = canonicaliseProofPayload(base);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), privateKey);
  base.signature = sig.toString("base64");
  return base;
}

describe("validateProof — accepts a well-formed proof", () => {
  test("returns ok: true with all fields", () => {
    const proof = freshSignedProof();
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.proof.version, "simurgh-integrity-proof-v1");
    assert.equal(result.proof.session_id, "sess_abc");
    assert.ok(Buffer.isBuffer(result.proof.nonce_bytes), "exposes raw nonce_bytes");
  });
});

describe("validateProof — required field checks", () => {
  for (const field of [
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
    test(`rejects missing ${field}`, () => {
      const proof = freshSignedProof();
      delete proof[field];
      const result = validateProof(proof, { now: NOW });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`missing_field:${field}|invalid_`));
    });
  }
});

describe("validateProof — forbidden fields", () => {
  for (const field of ["screen_pixels", "typed_answer", "paste_content", "webcam"]) {
    test(`rejects forbidden field ${field}`, () => {
      const proof = freshSignedProof();
      proof[field] = "anything";
      const result = validateProof(proof, { now: NOW });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`forbidden_field:${field}`));
    });
  }
});

describe("validateProof — version/platform/privacy_mode", () => {
  test("rejects unsupported version", () => {
    const proof = freshSignedProof({ version: "simurgh-integrity-proof-v9" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "unsupported_version");
  });

  test("rejects non-macos platform", () => {
    const proof = freshSignedProof({ platform: "linux" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "unsupported_platform");
  });

  test("rejects non-metadata privacy mode", () => {
    const proof = freshSignedProof({ privacy_mode: "full_capture" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_privacy_mode");
  });
});

describe("validateProof — session_id format", () => {
  test("rejects path-traversal session id", () => {
    const proof = freshSignedProof({ session_id: "../../etc/passwd" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_session_id");
  });
});

describe("validateProof — timestamp window", () => {
  test("accepts within 25s past", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW - 25_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true);
  });

  test("accepts within 4s future", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW + 4_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true);
  });

  test("rejects 60s past", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW - 60_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "proof_stale");
  });

  test("rejects 60s future", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW + 60_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "proof_in_future");
  });
});

describe("validateProof — capabilities and signals", () => {
  test("rejects capabilities as array", () => {
    const proof = freshSignedProof({ capabilities: ["screencapturekit_available"] });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_capabilities");
  });

  test("rejects capabilities missing a key", () => {
    const caps = {
      screencapturekit_available: false,
      window_enumeration: false,
      sharing_state_scan: false,
    };
    const proof = freshSignedProof({ capabilities: caps });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_capabilities");
  });

  test("rejects signals with wrong helper_status", () => {
    const sig = {
      node_uptime_ms: 0,
      window_count: 0,
      capture_excluded_window_count: 0,
      helper_status: "rebooting",
    };
    const proof = freshSignedProof({ signals: sig });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signals");
  });
});

describe("validateProof — public key and node_id_hash", () => {
  test("rejects public key that decodes to 31 bytes", () => {
    const proof = freshSignedProof({ node_public_key: Buffer.alloc(31).toString("base64") });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_public_key");
  });

  test("rejects node_id_hash that does not match the public key", () => {
    const proof = freshSignedProof({ node_id_hash: "0".repeat(64) });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "node_id_hash_mismatch");
  });
});

describe("validateProof — signature", () => {
  test("rejects signature that decodes to 63 bytes", () => {
    const proof = freshSignedProof();
    proof.signature = Buffer.alloc(63).toString("base64");
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signature_format");
  });

  test("rejects signature that doesn't verify (zeroed)", () => {
    const proof = freshSignedProof();
    proof.signature = Buffer.alloc(64).toString("base64");
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signature");
  });

  test("re-ordered keys in input still verify (canonicaliser sorts)", () => {
    const proof = freshSignedProof();
    const reordered = Object.fromEntries(Object.entries(proof).reverse());
    const result = validateProof(reordered, { now: NOW });
    assert.equal(result.ok, true);
  });
});
