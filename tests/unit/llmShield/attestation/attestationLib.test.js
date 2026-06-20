// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3L_EVIDENCE_PATHS,
  NON_CLAIMS,
  scanLeakage,
  evaluateGateResults,
  buildBundle,
  validateBundleSchema,
  validateSidecarSchema,
} from "../../../../tools/simurgh-attestation/attestationLib.mjs";

const GOOD_METRICS = {
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

function goodRefs() {
  return STAGE3L_EVIDENCE_PATHS.map((path) => ({ path, sha256: "sha256:x" }));
}

test("evaluateGateResults passes for clean Stage 3L metrics", () => {
  const r = evaluateGateResults(GOOD_METRICS);
  assert.equal(r.all_hard_gates_passed, true);
  assert.equal(r.gates.malicious_targeted_asr, true);
});

test("evaluateGateResults fails when a gate is violated", () => {
  const r = evaluateGateResults({ ...GOOD_METRICS, malicious_targeted_asr: 1 });
  assert.equal(r.all_hard_gates_passed, false);
  assert.equal(r.gates.malicious_targeted_asr, false);
});

test("buildBundle assembles a schema-valid run-set bundle with non-claims", () => {
  const bundle = buildBundle({
    metrics: GOOD_METRICS,
    boundaryBreakdown: { boundary_distribution: {} },
    policyDigests: { stage: "3L", files: [] },
    privacyReport: { generated_evidence_leakage: 0 },
    referencedEvidence: goodRefs(),
  });
  assert.equal(bundle.attestation_type, "simurgh.vca.run_set.v1");
  assert.equal(bundle.attested_run.case_count, 180);
  assert.deepEqual(bundle.non_claims, NON_CLAIMS);
  assert.equal(validateBundleSchema(bundle).ok, true);
});

test("validateBundleSchema rejects missing / duplicate / unprefixed references", () => {
  const base = buildBundle({
    metrics: GOOD_METRICS,
    boundaryBreakdown: {},
    policyDigests: {},
    privacyReport: { generated_evidence_leakage: 0 },
    referencedEvidence: goodRefs(),
  });
  // drop one file
  assert.equal(validateBundleSchema({ ...base, referenced_evidence: goodRefs().slice(1) }).ok, false);
  // duplicate path
  const dup = goodRefs();
  dup[1] = { ...dup[0] };
  assert.equal(validateBundleSchema({ ...base, referenced_evidence: dup }).ok, false);
  // unprefixed hash
  const bad = goodRefs();
  bad[0] = { path: bad[0].path, sha256: "deadbeef" };
  assert.equal(validateBundleSchema({ ...base, referenced_evidence: bad }).ok, false);
});

test("validateSidecarSchema rejects a wrong algorithm", () => {
  const ok = validateSidecarSchema({
    signature_type: "simurgh.vca.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: "sha256:x",
    public_key_fingerprint: "sha256:y",
    signature: "base64:z",
  });
  assert.equal(ok.ok, true);
  assert.equal(validateSidecarSchema({ algorithm: "RSA" }).ok, false);
});

test("scanLeakage flags forbidden tokens and passes clean content", () => {
  assert.deepEqual(scanLeakage([["clean.json", '{"receipt_coverage":180}']]), []);
  assert.equal(scanLeakage([["bad.json", '{"api_key":"x"}']]).length, 1);
});
