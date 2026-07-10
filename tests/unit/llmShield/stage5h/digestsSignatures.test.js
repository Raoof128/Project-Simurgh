// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — domain digests + Ed25519 signature surface.
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  domainDigest,
  artifactDigest,
  identityDigest,
  canonicalJson,
} from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";
import {
  fingerprint,
  signContent,
  verifyContent,
} from "../../../../tools/simurgh-attestation/stage5h/core/signatures.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5h/constants.mjs";

test("domainDigest is sha256(domainSep + canonicalJson) with sha256: prefix", () => {
  const d = domainDigest(DOMAIN.claim, { b: 1, a: 2 });
  assert.match(d, /^sha256:[0-9a-f]{64}$/);
  // key order does not matter (canonicalisation)
  assert.equal(domainDigest(DOMAIN.claim, { a: 2, b: 1 }), d);
  // domain separation: same content, different domain → different digest
  assert.notEqual(domainDigest(DOMAIN.review_receipt, { a: 2, b: 1 }), d);
});

test("artifactDigest is undomained canonical digest", () => {
  assert.match(artifactDigest({ x: 1 }), /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(artifactDigest({ x: 1 }), domainDigest(DOMAIN.claim, { x: 1 }));
});

test("identityDigest binds subject+fingerprint only, never the PEM", () => {
  const id = {
    identity_subject: "lab@example.org",
    key_fingerprint: "sha256:deadbeef",
    public_key_pem: "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----\n",
  };
  const d = identityDigest(id);
  // PEM wrapping must not change identity
  const id2 = { ...id, public_key_pem: "different pem entirely" };
  assert.equal(identityDigest(id2), d);
  // changing subject or fingerprint DOES change it
  assert.notEqual(identityDigest({ ...id, identity_subject: "x" }), d);
  assert.notEqual(identityDigest({ ...id, key_fingerprint: "sha256:00" }), d);
});

test("fingerprint = shared SPKI-DER; verifyContent recomputes fp from PEM first", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const priv = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const fp = fingerprint(pem);
  const content = { hello: "world", n: "0.94" };
  const sig = signContent(priv, DOMAIN.claim, content);
  const identity = { public_key_pem: pem, key_fingerprint: fp };
  assert.equal(verifyContent(identity, DOMAIN.claim, content, sig), true);
  // wrong domain fails to verify
  assert.equal(verifyContent(identity, DOMAIN.review_receipt, content, sig), false);
  // declared fp not matching the PEM throws (never verify against an unauthenticated key)
  assert.throws(() =>
    verifyContent({ public_key_pem: pem, key_fingerprint: "sha256:00" }, DOMAIN.claim, content, sig)
  );
});

test("canonicalJson re-exported for byte-equal comparisons", () => {
  assert.equal(canonicalJson({ a: 1, b: 2 }), canonicalJson({ b: 2, a: 1 }));
});
