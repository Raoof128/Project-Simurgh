// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { safeParsedPairingHints } from "../../../src/integrity/pairingAuditHints.js";
import { computeNodeIdHash } from "../../../src/integrity/proofSignature.js";

function freshRaw(overrides = {}) {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  return {
    node_public_key: rawPub.toString("base64"),
    node_id_hash: computeNodeIdHash(rawPub),
    signature: "AAAA",
    ...overrides,
  };
}

describe("safeParsedPairingHints", () => {
  test("emits node_id_hash only when pubkey decodes and hash matches", () => {
    const hints = safeParsedPairingHints(freshRaw());
    assert.match(hints.node_id_hash_if_parsed, /^[0-9a-f]{64}$/);
    assert.equal(hints.has_signature, true);
  });

  test("withholds node_id_hash when hash regex matches but pubkey is missing", () => {
    const raw = freshRaw();
    delete raw.node_public_key;
    const hints = safeParsedPairingHints(raw);
    assert.equal(hints.node_id_hash_if_parsed, null);
  });

  test("withholds node_id_hash when pubkey is wrong length", () => {
    const raw = freshRaw({ node_public_key: Buffer.alloc(31).toString("base64") });
    const hints = safeParsedPairingHints(raw);
    assert.equal(hints.node_id_hash_if_parsed, null);
  });

  test("withholds node_id_hash when hash does not match decoded pubkey", () => {
    const raw = freshRaw({ node_id_hash: "f".repeat(64) });
    const hints = safeParsedPairingHints(raw);
    assert.equal(hints.node_id_hash_if_parsed, null);
  });

  test("withholds node_id_hash when format is invalid", () => {
    const raw = freshRaw({ node_id_hash: "not-hex" });
    const hints = safeParsedPairingHints(raw);
    assert.equal(hints.node_id_hash_if_parsed, null);
  });

  test("has_signature false when signature missing or empty", () => {
    assert.equal(safeParsedPairingHints({}).has_signature, false);
    assert.equal(safeParsedPairingHints({ signature: "" }).has_signature, false);
    assert.equal(safeParsedPairingHints({ signature: 123 }).has_signature, false);
  });

  test("handles non-object input gracefully", () => {
    assert.equal(safeParsedPairingHints(null).node_id_hash_if_parsed, null);
    assert.equal(safeParsedPairingHints(undefined).has_signature, false);
  });

  test("withholds node_id_hash when pubkey is not valid base64", () => {
    const raw = freshRaw({ node_public_key: "not!!!base64" });
    const hints = safeParsedPairingHints(raw);
    assert.equal(hints.node_id_hash_if_parsed, null);
  });
});
