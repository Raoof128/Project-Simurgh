// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createEd25519PublicKeyFromRaw,
  verifyProofSignature,
  computeNodeIdHash,
} from "../../../src/integrity/proofSignature.js";

function freshKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const jwk = publicKey.export({ format: "jwk" });
  // jwk.x is the raw 32-byte public key base64url-encoded.
  const rawPubBytes = Buffer.from(jwk.x, "base64url");
  return { publicKey, privateKey, rawPubBytes };
}

function sign(privateKey, data) {
  return crypto.sign(null, Buffer.from(data, "utf8"), privateKey);
}

describe("proofSignature", () => {
  test("createEd25519PublicKeyFromRaw produces a usable KeyObject", () => {
    const { rawPubBytes } = freshKeypair();
    const keyObject = createEd25519PublicKeyFromRaw(rawPubBytes);
    assert.equal(keyObject.type, "public");
    assert.equal(keyObject.asymmetricKeyType, "ed25519");
  });

  test("rejects non-32-byte input", () => {
    assert.throws(() => createEd25519PublicKeyFromRaw(Buffer.alloc(31)), /invalid_public_key/);
    assert.throws(() => createEd25519PublicKeyFromRaw(Buffer.alloc(33)), /invalid_public_key/);
    assert.throws(() => createEd25519PublicKeyFromRaw("not-a-buffer"), /invalid_public_key/);
  });

  test("computeNodeIdHash returns lowercase hex sha256 of raw public key", () => {
    const rawPub = Buffer.alloc(32, 0xaa);
    const expected = crypto.createHash("sha256").update(rawPub).digest("hex");
    assert.equal(computeNodeIdHash(rawPub), expected);
    assert.ok(/^[0-9a-f]{64}$/.test(computeNodeIdHash(rawPub)));
  });

  test("verifyProofSignature returns true for a valid signed canonical", () => {
    const { privateKey, rawPubBytes } = freshKeypair();
    const canonical = '{"a":1,"b":2}';
    const sig = sign(privateKey, canonical);
    assert.ok(verifyProofSignature(canonical, rawPubBytes, sig));
  });

  test("verifyProofSignature returns false for tampered canonical bytes", () => {
    const { privateKey, rawPubBytes } = freshKeypair();
    const sig = sign(privateKey, '{"a":1,"b":2}');
    assert.equal(verifyProofSignature('{"a":1,"b":3}', rawPubBytes, sig), false);
  });

  test("verifyProofSignature returns false for wrong public key", () => {
    const a = freshKeypair();
    const b = freshKeypair();
    const sig = sign(a.privateKey, "hello");
    assert.equal(verifyProofSignature("hello", b.rawPubBytes, sig), false);
  });

  test("verifyProofSignature returns false for malformed signature (not 64 bytes)", () => {
    const { rawPubBytes } = freshKeypair();
    assert.equal(verifyProofSignature("hello", rawPubBytes, Buffer.alloc(63)), false);
    assert.equal(verifyProofSignature("hello", rawPubBytes, Buffer.alloc(65)), false);
  });

  test("verifyProofSignature returns false on invalid public key bytes", () => {
    const { privateKey } = freshKeypair();
    const sig = sign(privateKey, "hello");
    const wrongPub = Buffer.alloc(32, 0xff);
    assert.equal(verifyProofSignature("hello", wrongPub, sig), false);
  });
});
