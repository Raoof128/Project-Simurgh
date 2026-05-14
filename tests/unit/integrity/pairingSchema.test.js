import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PAIRING_VERSION,
  PAIRING_PLATFORM,
  PAIRING_REQUIRED_FIELDS,
  PAIRING_FORBIDDEN_FIELDS,
  PAIRING_TIMESTAMP_PAST_MS,
  PAIRING_TIMESTAMP_FUTURE_MS,
  PAIRING_PUBLIC_KEY_BYTES,
  PAIRING_CHALLENGE_BYTES,
  PAIRING_SIGNATURE_BYTES,
  PAIRING_SESSION_ID_PATTERN,
  PAIRING_NODE_ID_HASH_PATTERN,
} from "../../../src/integrity/pairingSchema.js";
import { FORBIDDEN_FIELDS as PROOF_FORBIDDEN } from "../../../src/integrity/proofSchema.js";

describe("pairingSchema constants", () => {
  test("version and platform are pairing-v1 / macos", () => {
    assert.equal(PAIRING_VERSION, "simurgh-pairing-proof-v1");
    assert.equal(PAIRING_PLATFORM, "macos");
  });

  test("REQUIRED_FIELDS lists exactly the 8 v1 top-level fields", () => {
    assert.equal(PAIRING_REQUIRED_FIELDS.length, 8);
    for (const f of [
      "version",
      "platform",
      "session_id",
      "node_id_hash",
      "node_public_key",
      "challenge",
      "timestamp",
      "signature",
    ]) {
      assert.ok(PAIRING_REQUIRED_FIELDS.includes(f), `missing required: ${f}`);
    }
  });

  test("FORBIDDEN_FIELDS reuses the proof forbidden list", () => {
    for (const f of PROOF_FORBIDDEN) {
      assert.ok(PAIRING_FORBIDDEN_FIELDS.has(f), `missing forbidden: ${f}`);
    }
  });

  test("timestamp windows match proof (30s past, 5s future)", () => {
    assert.equal(PAIRING_TIMESTAMP_PAST_MS, 30_000);
    assert.equal(PAIRING_TIMESTAMP_FUTURE_MS, 5_000);
  });

  test("byte-length constants: public_key 32, challenge 32, signature 64", () => {
    assert.equal(PAIRING_PUBLIC_KEY_BYTES, 32);
    assert.equal(PAIRING_CHALLENGE_BYTES, 32);
    assert.equal(PAIRING_SIGNATURE_BYTES, 64);
  });

  test("regex patterns match expected formats", () => {
    assert.ok(PAIRING_SESSION_ID_PATTERN.test("sess_abc"));
    assert.ok(!PAIRING_SESSION_ID_PATTERN.test("../etc/passwd"));
    assert.ok(PAIRING_NODE_ID_HASH_PATTERN.test("a".repeat(64)));
    assert.ok(!PAIRING_NODE_ID_HASH_PATTERN.test("A".repeat(64)));
  });
});
