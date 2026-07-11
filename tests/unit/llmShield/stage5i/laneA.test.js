import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { verifyPack } from "../../../../tools/simurgh-attestation/stage5i/node/verify-vpc-attestation.mjs";
import { byteStable } from "../../../../tools/simurgh-attestation/stage5i/node/verify-byte-stability.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5i/node/build-vpc-evidence.mjs";
import { buildSignedBundle } from "../../../../tools/simurgh-attestation/stage5i/node/buildSignedBundle.mjs";
import { makeAdapterFacts } from "../../../../tools/simurgh-attestation/stage5i/node/adapter.mjs";
import { vpcVerify } from "../../../../tools/simurgh-attestation/stage5i/core/vpcCore.mjs";
import { fingerprint } from "../../../../tools/simurgh-attestation/stage5i/core/signatures.mjs";

function key(subject) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    id: { identity_subject: subject, public_key_pem: pem, key_fingerprint: fingerprint(pem) },
  };
}
const sections = ["1", "2", "3", "4", "5", "6", "7", "8"].map((id) => ({
  section_id: id,
  canonical_path: `sec/${id}`,
  redaction_types: [],
}));
const panel = [
  { i: 0, hostFp: "fp:hostA", lineage: "sha256:A", sec: ["1", "2", "3", "4", "5"] },
  { i: 1, hostFp: "fp:hostB", lineage: "sha256:B", sec: ["4", "5", "6", "7", "8"] },
];

test("committed Lane-A pack verifies raw 0 (public + audit)", () => {
  assert.equal(verifyPack(EVIDENCE_DIR, "public").raw, 0);
  assert.equal(verifyPack(EVIDENCE_DIR, "audit").raw, 0);
});

test("Lane-A evidence is byte-stable (sorted manifest)", () => {
  assert.equal(byteStable().ok, true);
});

// wirecard-*: EY signed off on evidence sourced from the audited party itself. In VPC that is an
// affiliation vouched by the producer — fails closed (registry exclusion 317, or self-vouch 326).
test("wirecard-affiliation-authority-is-producer → 317 (registry excludes producer)", () => {
  const keys = {
    producer: key("evidence-producer"),
    grantIssuer: key("coordinator"),
    affIssuer: key("affiliation-authority"),
    verifier: key("verifier"),
    reviewers: [key("reviewerA"), key("reviewerB")],
  };
  const { bundle, external_config } = buildSignedBundle(keys, { sections, panel });
  // The pinned affiliation authority IS the audited party (EY relying on Wirecard's own data).
  external_config.affiliation_issuer_registry[keys.producer.id.key_fingerprint] = {
    identity_subject: "evidence-producer",
  };
  const raw = vpcVerify(bundle, external_config, makeAdapterFacts(bundle, external_config), {
    tier: "public",
  }).raw;
  assert.equal(raw, 317);
});
