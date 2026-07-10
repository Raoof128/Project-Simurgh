import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson, sha256Hex } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage5g/core/digests.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5g/constants.mjs";

test("domainDigest = sha256(domainSep + canonicalJson(content))", () => {
  const content = { a: 1, b: 2 };
  assert.equal(
    domainDigest(DOMAIN.capture, content),
    sha256Hex(DOMAIN.capture + canonicalJson(content))
  );
});

test("domainDigest is key-order independent (canonicalises first)", () => {
  assert.equal(
    domainDigest(DOMAIN.capture, { a: 1, b: 2 }),
    domainDigest(DOMAIN.capture, { b: 2, a: 1 })
  );
});

test("different domain separators yield different digests for equal content", () => {
  const c = { x: "1" };
  assert.notEqual(domainDigest(DOMAIN.capture, c), domainDigest(DOMAIN.anchor_evidence, c));
});

test("digest is a sha256: prefixed hex string", () => {
  assert.match(domainDigest(DOMAIN.capture, {}), /^sha256:[0-9a-f]{64}$/);
});
