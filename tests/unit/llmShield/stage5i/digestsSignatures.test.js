import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  domainDigest,
  artifactDigest,
  identityDigest,
} from "../../../../tools/simurgh-attestation/stage5i/core/digests.mjs";
import {
  fingerprint,
  signContent,
  verifyContent,
  roleCollisionOk,
} from "../../../../tools/simurgh-attestation/stage5i/core/signatures.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5i/constants.mjs";

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    pem,
    fp: fingerprint(pem),
  };
}

test("domainDigest is domain-separated; artifactDigest is stable", () => {
  const a = domainDigest(DOMAINS.partition, { x: 1 });
  const b = domainDigest(DOMAINS.grant, { x: 1 });
  assert.notEqual(a, b, "different domains ⇒ different digest");
  assert.equal(
    artifactDigest({ a: 1, b: 2 }),
    artifactDigest({ b: 2, a: 1 }),
    "canonical key order"
  );
});

test("identityDigest binds subject+fingerprint, not PEM", () => {
  const id = {
    identity_subject: "reviewerA",
    key_fingerprint: "sha256:aa",
    public_key_pem: "PEM1",
  };
  const id2 = { ...id, public_key_pem: "PEM2-rewrapped" };
  assert.equal(identityDigest(id), identityDigest(id2), "PEM rewrap cannot change identity");
});

test("verifyContent: valid sig true; tampered false; wrong fp throws", () => {
  const k = keypair();
  const id = { identity_subject: "reviewerA", key_fingerprint: k.fp, public_key_pem: k.pem };
  const content = { evaluated_sections: ["6.3"] };
  const sig = signContent(k.privatePem, DOMAINS.receipt, content);
  assert.equal(verifyContent(id, DOMAINS.receipt, content, sig), true);
  assert.equal(verifyContent(id, DOMAINS.receipt, { evaluated_sections: ["6.4"] }, sig), false);
  assert.throws(() =>
    verifyContent({ ...id, key_fingerprint: "sha256:wrong" }, DOMAINS.receipt, content, sig)
  );
});

test("roleCollisionOk: matrix incl. B5 affiliation_issuer ≠ reviewer", () => {
  const [V, P, GI, AI, RA, RB, H] = ["V", "P", "GI", "AI", "RA", "RB", "H"];
  assert.ok(
    roleCollisionOk({
      verifier: V,
      producer: P,
      grantIssuers: [GI],
      affiliationIssuers: [AI],
      reviewers: [RA, RB],
      hosts: [H],
    }).ok
  );
  // reviewer == host is ALLOWED
  assert.ok(
    roleCollisionOk({
      verifier: V,
      producer: P,
      grantIssuers: [GI],
      affiliationIssuers: [AI],
      reviewers: [RA],
      hosts: [RA],
    }).ok
  );
  // prohibited collisions
  assert.equal(
    roleCollisionOk({ verifier: V, producer: P, reviewers: [P] }).reason,
    "reviewer_is_producer"
  );
  assert.equal(
    roleCollisionOk({ verifier: RA, producer: P, reviewers: [RA] }).reason,
    "verifier_role_collision"
  );
  assert.equal(
    roleCollisionOk({ verifier: V, producer: P, affiliationIssuers: [P] }).reason,
    "affiliation_issuer_is_producer"
  );
  assert.equal(
    roleCollisionOk({ verifier: V, producer: P, affiliationIssuers: [RA], reviewers: [RA] }).reason,
    "affiliation_issuer_is_reviewer"
  );
});
