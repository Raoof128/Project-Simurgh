// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import {
  buildBundle,
  evaluateGateResults,
  STAGE3L_EVIDENCE_PATHS,
} from "../../../../tools/simurgh-attestation/attestationLib.mjs";
import { verifyBundle } from "../../../../tools/simurgh-attestation/verify-attestation.mjs";

const METRICS = {
  total_cases: 180,
  input_miss_input_passed: 120,
  input_miss_contained_by_input_firewall: 0,
  input_miss_downstream_contained: 120,
  direct_input_blocked: 30,
  direct_input_contained_by_input_firewall: 30,
  case_expectation_mismatches: 0,
  malicious_targeted_asr: 0,
  benign_hard_negative_passed: 30,
  unauthorised_tool_execution: 0,
  unsafe_output_export: 0,
  context_authority_escalation: 0,
  receipt_coverage: 180,
  audit_chain_valid: 180,
};

function sign(bundle, privateKey, pubPem) {
  const bytes = Buffer.from(canonicalJson(bundle), "utf8");
  return {
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(bytes),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + crypto.sign(null, bytes, privateKey).toString("base64"),
  };
}

function fixture() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const evidenceFiles = STAGE3L_EVIDENCE_PATHS.map((p) => [p, Buffer.from(p)]);
  const referencedEvidence = evidenceFiles.map(([path, buf]) => ({ path, sha256: sha256Hex(buf) }));
  const bundle = buildBundle({
    metrics: METRICS,
    boundaryBreakdown: { boundary_distribution: {} },
    policyDigests: { stage: "3L", files: [] },
    privacyReport: { generated_evidence_leakage: 0 },
    referencedEvidence,
  });
  return { bundle, sidecar: sign(bundle, privateKey, pubPem), pubPem, privateKey, evidenceFiles };
}

test("portable verify passes for a freshly signed bundle", () => {
  const f = fixture();
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, true, JSON.stringify(r.checks));
});

test("tamper: flipped metric without re-signing fails signature + digest", () => {
  const f = fixture();
  const tampered = { ...f.bundle, metrics: { ...f.bundle.metrics, malicious_targeted_asr: 5 } };
  const r = verifyBundle({
    bundle: tampered,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.signature_valid, false);
  assert.equal(r.checks.bundle_digest_match, false);
});

test("tamper: re-signed bad metric fails declared_gates_pass", () => {
  const f = fixture();
  const bad = { ...f.bundle, metrics: { ...f.bundle.metrics, malicious_targeted_asr: 5 } };
  bad.gate_results = evaluateGateResults(bad.metrics); // honestly recomputed, but failing
  const r = verifyBundle({
    bundle: bad,
    sidecar: sign(bad, f.privateKey, f.pubPem),
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.declared_gates_pass, false);
});

test("tamper: decorative gate_results sticker fails gate_results_match", () => {
  const f = fixture();
  const bad = { ...f.bundle, metrics: { ...f.bundle.metrics, malicious_targeted_asr: 5 } };
  // leave gate_results claiming all passed (a lie); re-sign so signature is valid
  const r = verifyBundle({
    bundle: bad,
    sidecar: sign(bad, f.privateKey, f.pubPem),
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.gate_results_match, false);
});

test("tamper: edited referenced evidence file fails hash binding", () => {
  const f = fixture();
  const broken = f.evidenceFiles.map(([p], i) => [p, Buffer.from(i === 0 ? "EDITED" : p)]);
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: broken,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.evidence_file_hashes_match, false);
});

test("tamper: wrong public key fails signature", () => {
  const f = fixture();
  const other = crypto.generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: other,
    evidenceFiles: f.evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.signature_valid, false);
});

test("expected-fingerprint mismatch fails", () => {
  const f = fixture();
  const r = verifyBundle({
    bundle: f.bundle,
    sidecar: f.sidecar,
    publicKeyPem: f.pubPem,
    evidenceFiles: f.evidenceFiles,
    expectedFingerprint: "sha256:deadbeef",
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.key_fingerprint_match, false);
});

test("leakage: a forbidden token in a referenced file fails", () => {
  const f = fixture();
  // re-point the first referenced file's content to leak, re-bind its hash, re-sign
  const leaky = Buffer.from('{"api_key":"SENTINEL"}');
  const evidenceFiles = f.evidenceFiles.map(([p], i) => [p, i === 0 ? leaky : Buffer.from(p)]);
  const bundle = {
    ...f.bundle,
    referenced_evidence: evidenceFiles.map(([path, buf]) => ({ path, sha256: sha256Hex(buf) })),
  };
  const r = verifyBundle({
    bundle,
    sidecar: sign(bundle, f.privateKey, f.pubPem),
    publicKeyPem: f.pubPem,
    evidenceFiles,
  });
  assert.equal(r.pass, false);
  assert.equal(r.checks.evidence_leakage_zero, false);
});
