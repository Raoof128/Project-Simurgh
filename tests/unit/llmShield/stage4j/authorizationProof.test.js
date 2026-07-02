// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { publicKeyFingerprint } from "../../../../tools/simurgh-attestation/stage4d/stage4dCrypto.mjs";
import {
  ACTION_CLASSES,
  AUTHORITY_SOURCES,
  PCTA_SCHEMA,
  buildPctaManifest,
  computeProofDigest,
  validateProofShape,
  verifyPctaManifest,
  verifyProofSignature,
} from "../../../../tools/simurgh-attestation/stage4j/authorizationProof.mjs";
import { sign } from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4d/stage4dCrypto.mjs";

function keypair() {
  return generateKeyPairSync("ed25519");
}

function cleanPayload() {
  return {
    schema: PCTA_SCHEMA,
    tool: "send_email",
    action_class: "external_egress",
    authorized_action_digest: `sha256:${"a".repeat(64)}`,
    user_intent_digest: `sha256:${"b".repeat(64)}`,
    policy_digest: `sha256:${"c".repeat(64)}`,
    authority_source: "user_confirmed",
    untrusted_context_reached_authority: false,
    dfi_certificate_digest: `sha256:${"d".repeat(64)}`,
    epoch: 1782892800,
    nonce: "b3f1abcd",
    nonce_scope: "signed_pack",
    enforcement: {
      required: true,
      applied: true,
      applied_action_class: "external_egress",
      applied_action_digest: `sha256:${"a".repeat(64)}`,
    },
  };
}

function signedProof(payload, privateKey, publicKey) {
  const signature = sign(null, Buffer.from(canonicalJson(payload), "utf8"), privateKey);
  return {
    payload,
    signature: `ed25519:${signature.toString("base64")}`,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKey.export({ type: "spki", format: "pem" }))}`,
  };
}

// The pinned keyset is a Map<fingerprint, KeyObject> (see plan §J2 note): the verifier must
// resolve the fingerprint to a public key, not merely check membership.
function pinnedMap(proof, publicKey) {
  return new Map([[proof.public_key_fingerprint, publicKey]]);
}

test("enums and schema constant are frozen and correct", () => {
  assert.equal(PCTA_SCHEMA, "simurgh.pcta.authorization.v1");
  assert.equal(AUTHORITY_SOURCES.includes("user_confirmed"), true);
  assert.equal(AUTHORITY_SOURCES.includes("untrusted_context"), true);
  assert.equal(ACTION_CLASSES.includes("external_egress"), true);
});

test("computeProofDigest is byte-stable across key reorder (JCS)", () => {
  const p = cleanPayload();
  const reordered = { enforcement: p.enforcement, schema: p.schema, ...p };
  assert.equal(computeProofDigest(p), computeProofDigest(reordered));
  assert.match(computeProofDigest(p), /^sha256:[a-f0-9]{64}$/);
});

test("validateProofShape accepts a clean proof and rejects malformed ones", () => {
  const { privateKey, publicKey } = keypair();
  const proof = signedProof(cleanPayload(), privateKey, publicKey);
  assert.deepEqual(validateProofShape(proof), { ok: true });

  const badClass = signedProof(
    { ...cleanPayload(), action_class: "nonsense" },
    privateKey,
    publicKey
  );
  assert.equal(validateProofShape(badClass).ok, false);

  const badSource = signedProof(
    { ...cleanPayload(), authority_source: "nonsense" },
    privateKey,
    publicKey
  );
  assert.equal(validateProofShape(badSource).ok, false);
});

test("signature verify requires valid sig AND pinned fingerprint (32 for both misses)", () => {
  const { privateKey, publicKey } = keypair();
  const proof = signedProof(cleanPayload(), privateKey, publicKey);
  const pinned = pinnedMap(proof, publicKey);

  assert.deepEqual(verifyProofSignature(proof, pinned), { ok: true });

  // corrupt signature
  const corrupt = { ...proof, signature: `ed25519:${Buffer.from("nope").toString("base64")}` };
  assert.equal(verifyProofSignature(corrupt, pinned).reason, "authorization_signature_invalid");

  // valid signature, unpinned key
  assert.equal(verifyProofSignature(proof, new Map()).reason, "authorization_signature_invalid");
});

test("PCTA manifest binds acyclically to the 4H run-root and verifies", () => {
  const { privateKey, publicKey } = keypair();
  const proof = signedProof(cleanPayload(), privateKey, publicKey);
  const runRoot = `sha256:${"e".repeat(64)}`;
  const dfiDigest = proof.payload.dfi_certificate_digest;
  const pm = buildPctaManifest({ proof, runRoot, dfiCertificateDigest: dfiDigest, privateKey });
  assert.equal(pm.run_root, runRoot);
  assert.match(pm.pcta_proof_digest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(
    verifyPctaManifest({
      pctaManifest: pm,
      proof,
      runRoot,
      dfiCertificateDigest: dfiDigest,
      publicKey,
    }),
    { ok: true }
  );

  // tamper: swap the proof digest -> reject
  const tampered = { ...pm, pcta_proof_digest: `sha256:${"f".repeat(64)}` };
  assert.equal(
    verifyPctaManifest({
      pctaManifest: tampered,
      proof,
      runRoot,
      dfiCertificateDigest: dfiDigest,
      publicKey,
    }).ok,
    false
  );
});
