// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CERTIFICATE_TYPE,
  CHECKER_VERSION,
  MANIFEST_DOMAIN,
  STAGE4H_EVIDENCE_DIR,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  HARNESS_CODES,
  RAW_VERIFIER_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  validateDfiCertificate,
  validateSignedPackManifest,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";

const digest = (char) => `sha256:${char.repeat(64)}`;

function validCertificate() {
  return {
    type: CERTIFICATE_TYPE,
    proof_system: "simurgh-ifc-lattice-v0",
    claim: "explicit_data_flow_integrity",
    scope: {
      explicit_data_edges: true,
      control_dependence_edges: false,
      implicit_flow_security: false,
    },
    run_id_hash: digest("1"),
    base_pack_digest: digest("2"),
    replay_root: digest("3"),
    premise_digest: digest("4"),
    policy_digest: digest("5"),
    lattice_digest: digest("6"),
    checker_version: CHECKER_VERSION,
    derivation: {
      derived_node_labels: [],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
    summary: {
      sources_checked: 0,
      edges_checked: 0,
      authority_sinks_checked: 0,
      violations: 0,
    },
  };
}

test("Stage 4H constants pin certificate type, checker version, domain, and evidence root", () => {
  assert.equal(CERTIFICATE_TYPE, "simurgh.vca.dfi_certificate.v1");
  assert.equal(CHECKER_VERSION, "4h-v0");
  assert.equal(MANIFEST_DOMAIN, "SIMURGH_STAGE4H_MANIFEST_V1\0");
  assert.equal(STAGE4H_EVIDENCE_DIR, "docs/research/llm-shield/evidence/stage-4h");
});

test("Stage 4H raw verifier codes exclude harness-only code 19", () => {
  assert.equal(RAW_VERIFIER_CODES.OK, 0);
  assert.equal(RAW_VERIFIER_CODES.SCHEMA_INVALID, 20);
  assert.equal(RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH, 22);
  assert.equal(RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH, 25);
  assert.equal(RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE, 28);
  assert.equal(RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED, 29);
  assert.equal(HARNESS_CODES.CLEAN_RUN_FALSELY_REJECTED, 19);
  assert.equal(Object.values(RAW_VERIFIER_CODES).includes(19), false);
});

test("Stage 4H wrapper maps raw and harness codes to Stage 4 run-level codes", () => {
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(19), 1);
  assert.equal(stage4CodeForRawCode(20), 1);
  assert.equal(stage4CodeForRawCode(27), 1);
  assert.equal(stage4CodeForRawCode(28), 2);
  assert.equal(stage4CodeForRawCode(29), 3);
});

test("Stage 4H schema accepts the minimal strict 4H.0 certificate", () => {
  assert.deepEqual(validateDfiCertificate(validCertificate()), { ok: true });
});

test("Stage 4H schema rejects unknown fields at every schema-owned level", () => {
  assert.equal(validateDfiCertificate({ ...validCertificate(), extra: true }).ok, false);
  assert.equal(
    validateDfiCertificate({
      ...validCertificate(),
      derivation: { ...validCertificate().derivation, hidden_premise: [] },
    }).ok,
    false
  );
  assert.equal(
    validateDfiCertificate({
      ...validCertificate(),
      summary: { ...validCertificate().summary, raw_prompt: "secret" },
    }).ok,
    false
  );
});

test("Stage 4H schema rejects self-binding or malformed digest fields", () => {
  assert.equal(
    validateDfiCertificate({ ...validCertificate(), certificate_digest: digest("7") }).ok,
    false
  );
  assert.equal(validateDfiCertificate({ ...validCertificate(), premise_digest: "abc" }).ok, false);
});

test("Stage 4H schema validates a signed manifest with certificate digest outside certificate", () => {
  const manifest = {
    manifest_version: "simurgh.vca.signed_pack_manifest.v1",
    base_pack_digest: digest("2"),
    certificate_digest: digest("7"),
    hermeticity_attestation_digest: digest("a"),
    signed_pack_manifest_digest: digest("8"),
    merkle_root: digest("9"),
    signature: "base64:ZmFrZQ==",
  };
  assert.deepEqual(validateSignedPackManifest(manifest), { ok: true });
  assert.equal(validateSignedPackManifest({ ...manifest, unexpected: true }).ok, false);
});

test("Stage 4H.1 schema validates non-empty derivation entry shapes", () => {
  const premiseRef = `premise:${digest("a")}`;
  const cert = {
    ...validCertificate(),
    derivation: {
      derived_node_labels: [{ node: "action:a1", label: "trusted", premise_refs: [premiseRef] }],
      lattice_steps: [{ op: "combine", node: "action:a1", inputs: ["trusted"], result: "trusted" }],
      sink_safety_claims: [{ node: "action:a1", node_label: "trusted", safe: true }],
      premise_refs: [premiseRef],
    },
  };
  assert.deepEqual(validateDfiCertificate(cert), { ok: true });
});

test("Stage 4H.1 schema rejects unknown derivation entry fields", () => {
  const cert = {
    ...validCertificate(),
    derivation: {
      derived_node_labels: [
        { node: "action:a1", label: "trusted", premise_refs: [], smuggled: true },
      ],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
  };
  assert.equal(validateDfiCertificate(cert).ok, false);
});

test("Stage 4H.1 schema rejects raw Stage 4D labels inside derivation entries", () => {
  const cert = {
    ...validCertificate(),
    derivation: {
      derived_node_labels: [{ node: "source:web", label: "untrusted_web", premise_refs: [] }],
      lattice_steps: [],
      sink_safety_claims: [],
      premise_refs: [],
    },
  };
  assert.equal(validateDfiCertificate(cert).ok, false);
});
