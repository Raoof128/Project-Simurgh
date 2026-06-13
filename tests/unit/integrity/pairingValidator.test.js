// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validatePairingProof } from "../../../src/integrity/pairingValidator.js";
import { canonicalisePairingPayload } from "../../../src/integrity/pairingCanonicalise.js";
import { computeNodeIdHash } from "../../../src/integrity/proofSignature.js";

const NOW = Date.parse("2026-05-14T12:00:00.000Z");

function freshSignedPairing(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const base = {
    version: "simurgh-pairing-proof-v1",
    platform: "macos",
    session_id: "sess_abc",
    node_id_hash: computeNodeIdHash(rawPub),
    node_public_key: rawPub.toString("base64"),
    challenge: crypto.randomBytes(32).toString("base64"),
    timestamp: new Date(NOW).toISOString(),
    ...overrides,
  };
  const canonical = canonicalisePairingPayload(base);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), privateKey);
  base.signature = sig.toString("base64");
  return base;
}

describe("validatePairingProof — happy path", () => {
  test("accepts well-formed pairing", () => {
    const payload = freshSignedPairing();
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.payload.version, "simurgh-pairing-proof-v1");
    assert.ok(Buffer.isBuffer(result.payload.challenge_bytes), "exposes raw challenge_bytes");
  });
});

describe("validatePairingProof — required field checks", () => {
  for (const field of [
    "version",
    "platform",
    "session_id",
    "node_id_hash",
    "node_public_key",
    "challenge",
    "timestamp",
    "signature",
  ]) {
    test(`rejects missing ${field}`, () => {
      const payload = freshSignedPairing();
      delete payload[field];
      const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`missing_field:${field}|invalid_`));
    });
  }
});

describe("validatePairingProof — strict 8-key enforcement", () => {
  test("rejects unknown extra field", () => {
    const payload = freshSignedPairing({ extra: "no" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, false);
    assert.match(result.reason, /unknown_field:extra/);
  });
});

describe("validatePairingProof — forbidden fields", () => {
  for (const field of ["screen_pixels", "typed_answer", "paste_content", "webcam"]) {
    test(`rejects forbidden ${field}`, () => {
      const payload = freshSignedPairing({ [field]: "x" });
      const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`forbidden_field:${field}|unknown_field`));
    });
  }
});

describe("validatePairingProof — version/platform/session", () => {
  test("rejects unsupported version", () => {
    const payload = freshSignedPairing({ version: "simurgh-pairing-proof-v9" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "unsupported_version");
  });

  test("rejects non-macos platform", () => {
    const payload = freshSignedPairing({ platform: "linux" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "unsupported_platform");
  });

  test("rejects invalid session_id format", () => {
    const payload = freshSignedPairing({ session_id: "../../etc/passwd" });
    const result = validatePairingProof(payload, {
      now: NOW,
      expectedSessionId: "../../etc/passwd",
    });
    assert.equal(result.reason, "invalid_session_id");
  });

  test("rejects session_id mismatch with expectedSessionId", () => {
    const payload = freshSignedPairing({ session_id: "sess_abc" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_xyz" });
    assert.equal(result.reason, "proof_session_mismatch");
  });
});

describe("validatePairingProof — timestamp window", () => {
  test("accepts 25s past", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW - 25_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true);
  });

  test("rejects 60s past as pairing_stale", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW - 60_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "pairing_stale");
  });

  test("rejects 60s future as pairing_in_future", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW + 60_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "pairing_in_future");
  });
});

describe("validatePairingProof — public key + node_id_hash", () => {
  test("rejects 31-byte public key", () => {
    const payload = freshSignedPairing({ node_public_key: Buffer.alloc(31).toString("base64") });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_public_key");
  });

  test("rejects mismatched node_id_hash", () => {
    const payload = freshSignedPairing({ node_id_hash: "0".repeat(64) });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "node_id_hash_mismatch");
  });
});

describe("validatePairingProof — challenge + signature format", () => {
  test("rejects 31-byte challenge", () => {
    const payload = freshSignedPairing({ challenge: Buffer.alloc(31).toString("base64") });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_challenge_format");
  });

  test("rejects 63-byte signature", () => {
    const payload = freshSignedPairing();
    payload.signature = Buffer.alloc(63).toString("base64");
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_signature_format");
  });
});

describe("validatePairingProof — signature verification", () => {
  test("rejects zeroed signature with invalid_signature", () => {
    const payload = freshSignedPairing();
    payload.signature = Buffer.alloc(64).toString("base64");
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_signature");
  });

  test("reordered keys still verify (canonicaliser sorts)", () => {
    const payload = freshSignedPairing();
    const reordered = Object.fromEntries(Object.entries(payload).reverse());
    const result = validatePairingProof(reordered, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true);
  });
});
