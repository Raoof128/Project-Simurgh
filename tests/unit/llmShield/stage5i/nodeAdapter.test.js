import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
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

function makeKeys() {
  return {
    producer: key("evidence-producer"),
    grantIssuer: key("panel-coordinator"),
    affIssuer: key("affiliation-authority"),
    verifier: key("simurgh-verifier"),
    reviewers: [key("reviewerA"), key("reviewerB")],
  };
}

const sections = ["1", "2", "3", "4", "5", "6", "7", "8"].map((id) => ({
  section_id: id,
  canonical_path: `sec/${id}`,
  redaction_types: [],
}));
const panel = [
  { i: 0, hostFp: "fp:hostA", lineage: "lineage:A", sec: ["1", "2", "3", "4", "5"] },
  { i: 1, hostFp: "fp:hostB", lineage: "lineage:B", sec: ["4", "5", "6", "7", "8"] },
];

test("real signed bundle verifies raw 0 (public AND audit) via the adapter", () => {
  const { bundle, external_config } = buildSignedBundle(makeKeys(), { sections, panel });
  const facts = makeAdapterFacts(bundle, external_config);
  assert.equal(facts.sigValid, true);
  assert.equal(
    facts.challengeBoundDigests.size,
    4,
    "2 reviewer + 2 host separation objects challenge-bound"
  );
  assert.equal(vpcVerify(bundle, external_config, facts, { tier: "public" }).raw, 0);
  assert.equal(vpcVerify(bundle, external_config, facts, { tier: "audit" }).raw, 0);
});

test("tampered receipt signature → sigValid false → 319", () => {
  const { bundle, external_config } = buildSignedBundle(makeKeys(), { sections, panel });
  bundle.coverage_receipts[0].content.evaluated_sections.push("6"); // content changed, signature stale
  const facts = makeAdapterFacts(bundle, external_config);
  assert.equal(facts.sigValid, false);
  assert.equal(vpcVerify(bundle, external_config, facts, { tier: "public" }).raw, 319);
});

test("tampered challenge → not challenge-bound → separation under policy → 325", () => {
  const { bundle, external_config } = buildSignedBundle(makeKeys(), { sections, panel });
  // Break reviewerA's challenge binding (wrong root) WITHOUT touching the signed receipt.
  bundle.reviewer_separation_evidence[0].challenge_receipt.content.bound_panel_subject_root =
    "sha256:forged";
  const facts = makeAdapterFacts(bundle, external_config);
  // The receipt still resolves its separation evidence by digest (we changed the challenge, so the
  // evidence digest changed) — so it manifests as an unresolved reference (321) OR under-separation.
  const raw = vpcVerify(bundle, external_config, facts, { tier: "public" }).raw;
  assert.ok(raw === 325 || raw === 321, `expected 325 or 321, got ${raw}`);
});
