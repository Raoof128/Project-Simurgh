// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";

test("canonicalJson sorts keys deterministically regardless of input order", () => {
  const a = canonicalJson({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalJson({ a: { c: 3, d: 4 }, b: 1 });
  assert.equal(a, b);
  assert.equal(a, '{"a":{"c":3,"d":4},"b":1}');
});

test("canonicalJson preserves array order", () => {
  assert.equal(canonicalJson({ x: [3, 1, 2] }), '{"x":[3,1,2]}');
});

test("sha256Hex is stable and prefixed", () => {
  assert.equal(
    sha256Hex("abc"),
    "sha256:" + crypto.createHash("sha256").update("abc").digest("hex")
  );
});

test("fingerprintPublicKey hashes the DER SPKI bytes", () => {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  const der = crypto.createPublicKey(pem).export({ type: "spki", format: "der" });
  assert.equal(
    fingerprintPublicKey(pem),
    "sha256:" + crypto.createHash("sha256").update(der).digest("hex")
  );
});
