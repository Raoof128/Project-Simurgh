#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPrivateKey, createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildEvidencePack, signPack } from "../stage4d/packBuilder.mjs";
import { verifyEvidencePack } from "../stage4d/verifyPack.mjs";
import { buildPremiseSet } from "./canonicalPremises.mjs";
import { STAGE4D_EVIDENCE_DIR, STAGE4H_EVIDENCE_DIR } from "./constants.mjs";
import { buildDfiCertificate, certificateDigest, validateDerivation } from "./dfiCertificate.mjs";
import { RAW_VERIFIER_CODES, stage4CodeForRawCode } from "./exitCodes.mjs";
import { buildSignedPackManifest, verifyPackBinding } from "./packBinding.mjs";
import { privacyGate } from "./privacyGate.mjs";
import { validateDfiCertificate } from "./schema.mjs";
import { buildCleanTamperContext, buildTamperMatrix } from "./tamperClosure.mjs";
import { main as verifyStage4h } from "./verify-stage4h-digest-binding.mjs";

const WRONG_BASE_PACK_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAuqH7hI0ASnLLnjkeMnVAi6IeKvwhxC7+cif/RoiTa/8=
-----END PUBLIC KEY-----
`;

async function stable(value) {
  const json = JSON.stringify(value, null, 2) + "\n";
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, await stable(value));
}

function stage4dRunRecord({ runId, sourceLabel }) {
  const parent = `session_${runId}`;
  return {
    run_manifest: {
      fixture_id: runId,
      mode: "stage4h1_synthetic_fixture",
      model_identity_committed: "self-reported-fixture-model",
      model_identity_origin: "self_reported",
      parent_session: parent,
      run_id: runId,
    },
    policy_bundle: {
      policy_version: "policy.v1",
      modes: {
        balanced: {
          block_authority_escalation: true,
          block_untrusted_to_destructive_mutation: true,
          block_untrusted_to_external_egress: true,
          block_untrusted_to_secret_export: true,
        },
        permissive: {
          block_authority_escalation: true,
          block_untrusted_to_destructive_mutation: true,
          block_untrusted_to_external_egress: false,
          block_untrusted_to_secret_export: true,
        },
        strict: {
          block_any_untrusted_to_authority_sink: true,
        },
      },
    },
    sink_registry: {
      registry_version: "sinks.v1",
      sinks: [
        {
          default_consequence_class: "external_egress",
          description: "Synthetic Stage 4H.1 authority sink fixture",
          sink_id: "egress",
        },
      ],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "external_egress"],
    },
    action_observation_log: [
      {
        action_id: "act_000",
        action_type: "tool_call",
        boundary_id: "gateway_mediator_v1",
        consequence_class: "external_egress",
        event_version: "simurgh.stage4d.observation.v1",
        parent_session: parent,
        run_id: runId,
        sink_id: "egress",
        step_index: 0,
      },
    ],
    replay_material: {
      act_000: {
        decision_context: {
          policy_mode: "permissive",
          prior_decision_count: 0,
          rate_limit_bucket: "stage4h1_fixture_bucket",
        },
        policy_features_source: {
          external_effect: true,
          input_sources: ["doc1"],
          requires_authority: true,
          sink_id: "egress",
          user_explicitly_authorised: true,
        },
        resolved_args_redacted: {
          body_digest: sourceLabel === "trusted" ? "1".repeat(64) : "2".repeat(64),
          contains_secret_marker: false,
          recipient_scope: "fixture_contact",
          tool_name: "send_email",
        },
        taint_derivation_inputs: {
          authority_sink: true,
          sources: [{ source_id: "doc1", label: sourceLabel }],
        },
      },
    },
    decisions: [
      {
        action_id: "act_000",
        input_integrity_summary: sourceLabel === "trusted" ? "trusted_only" : "contains_untrusted",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        decision_input: {
          untrusted_reached_authority: sourceLabel !== "trusted",
          policy_mode: "permissive",
        },
      },
    ],
  };
}

function stage4h2DiscriminationRunRecord({ runId, dirty }) {
  const parent = `session_${runId}`;
  const actionA1Sources = dirty
    ? [
        { source_id: "doc1", label: "untrusted_web" },
        { source_id: "sys", label: "trusted" },
      ]
    : [{ source_id: "sys", label: "trusted" }];
  const replayMaterial = {
    act_000: {
      decision_context: {
        policy_mode: "permissive",
        prior_decision_count: 0,
        rate_limit_bucket: "stage4h2_fixture_bucket",
      },
      policy_features_source: {
        external_effect: false,
        input_sources: ["doc1"],
        requires_authority: false,
        sink_id: "egress",
        user_explicitly_authorised: true,
      },
      resolved_args_redacted: {
        body_digest: "3".repeat(64),
        contains_secret_marker: false,
        recipient_scope: "fixture_contact",
        tool_name: "draft_note",
      },
      taint_derivation_inputs: {
        authority_sink: false,
        sources: [{ source_id: "doc1", label: "untrusted_web" }],
      },
    },
    act_001: {
      decision_context: {
        policy_mode: "permissive",
        prior_decision_count: 1,
        rate_limit_bucket: "stage4h2_fixture_bucket",
      },
      policy_features_source: {
        external_effect: true,
        input_sources: actionA1Sources.map((source) => source.source_id).sort(),
        requires_authority: true,
        sink_id: "egress",
        user_explicitly_authorised: true,
      },
      resolved_args_redacted: {
        body_digest: "5".repeat(64),
        contains_secret_marker: false,
        recipient_scope: "fixture_contact",
        tool_name: "send_email",
      },
      taint_derivation_inputs: {
        authority_sink: true,
        sources: actionA1Sources,
      },
    },
  };

  return {
    run_manifest: {
      fixture_id: runId,
      mode: "stage4h2_synthetic_discrimination_fixture",
      model_identity_committed: "self-reported-fixture-model",
      model_identity_origin: "self_reported",
      parent_session: parent,
      run_id: runId,
    },
    policy_bundle: {
      policy_version: "policy.v1",
      modes: {
        permissive: {
          block_authority_escalation: true,
          block_untrusted_to_external_egress: false,
          block_untrusted_to_secret_export: true,
        },
      },
    },
    sink_registry: {
      registry_version: "sinks.v1",
      sinks: [
        {
          default_consequence_class: "external_egress",
          description: "Synthetic Stage 4H.2 authority sink fixture",
          sink_id: "egress",
        },
      ],
    },
    consequence_lattice: {
      lattice_version: "consequence_lattice.v1",
      order: ["read_only", "local_only", "external_egress"],
    },
    action_observation_log: [
      {
        action_id: "act_000",
        action_type: "tool_call",
        boundary_id: "gateway_mediator_v1",
        consequence_class: "read_only",
        event_version: "simurgh.stage4d.observation.v1",
        parent_session: parent,
        run_id: runId,
        sink_id: "egress",
        step_index: 0,
      },
      {
        action_id: "act_001",
        action_type: "tool_call",
        boundary_id: "gateway_mediator_v1",
        consequence_class: "external_egress",
        event_version: "simurgh.stage4d.observation.v1",
        parent_session: parent,
        run_id: runId,
        sink_id: "egress",
        step_index: 1,
      },
    ],
    replay_material: replayMaterial,
    decisions: [
      {
        action_id: "act_000",
        input_integrity_summary: "contains_untrusted",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        decision_input: {
          untrusted_reached_authority: false,
          policy_mode: "permissive",
        },
      },
      {
        action_id: "act_001",
        input_integrity_summary: dirty ? "contains_untrusted" : "trusted_only",
        decision: "allow",
        decision_reason_code: "POLICY_ALLOWED",
        decision_input: {
          untrusted_reached_authority: dirty,
          policy_mode: "permissive",
        },
      },
    ],
  };
}

function buildSignedStage4dPack({ runRecord, privateKey, publicKey }) {
  const pack = buildEvidencePack({ runRecord, privateKey, publicKey });
  const signature = `base64:${signPack(pack, privateKey)}`;
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const verification = verifyEvidencePack({ pack, signature, publicKeyPem });
  if (!verification.ok) {
    throw new Error(
      `synthetic Stage 4D fixture did not verify: ${
        verification.first_failure?.reason || "unknown"
      }`
    );
  }
  return { pack, signature, publicKeyPem };
}

function hasNormalizedUnsafeAuthorityFlow(pack) {
  const premises = buildPremiseSet(pack);
  const certificate = buildDfiCertificate({ pack });
  const result = validateDerivation({ premises, certificate });
  return result.code === RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION;
}

function signManifest(certificate, privateKey) {
  return buildSignedPackManifest({ certificate, privateKey });
}

async function runCliFixture(argv, expectedCode) {
  const previousExitCode = process.exitCode;
  const code = await verifyStage4h({ argv });
  process.exitCode = previousExitCode;
  if (code !== expectedCode) {
    throw new Error(`unexpected Stage 4H fixture CLI code: ${code}, expected ${expectedCode}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function privacyMutationCases(cleanCertificate) {
  return [
    {
      name: "clean",
      expected_code: RAW_VERIFIER_CODES.OK,
      expected_reason: null,
      certificate: structuredClone(cleanCertificate),
    },
    {
      name: "raw-label",
      expected_code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED,
      expected_reason: "non_enum_label",
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.derivation.derived_node_labels[0].label = "raw prompt text";
        return cert;
      })(),
    },
    {
      name: "raw-summary",
      expected_code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED,
      expected_reason: "raw_text_in_summary",
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.summary.violations = "raw transcript";
        return cert;
      })(),
    },
    {
      name: "raw-node-id",
      expected_code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED,
      expected_reason: "raw_text_in_key",
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.derivation.derived_node_labels[0].node = "source:raw prompt text with spaces";
        return cert;
      })(),
    },
    {
      name: "raw-premise-ref",
      expected_code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED,
      expected_reason: "raw_text_in_premise_ref",
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.derivation.premise_refs[0] = "premise:raw prompt";
        return cert;
      })(),
    },
    {
      name: "non-enum-label",
      expected_code: RAW_VERIFIER_CODES.PRIVACY_LEAK_DETECTED,
      expected_reason: "unknown_label_not_in_lattice_enum",
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.derivation.derived_node_labels[0].label = "maybe";
        return cert;
      })(),
    },
    {
      name: "unknown-field",
      expected_code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
      expected_reason: "unknown_field",
      schema_owned: true,
      certificate: (() => {
        const cert = structuredClone(cleanCertificate);
        cert.derivation.lattice_steps[0].leak = "raw";
        return cert;
      })(),
    },
    {
      name: "duplicate-key",
      expected_code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
      expected_reason: "duplicate_key",
      certificate: null,
    },
  ];
}

function buildPrivacyMatrix(cleanCertificate) {
  const results = privacyMutationCases(cleanCertificate).map((testCase) => {
    if (testCase.name === "duplicate-key") {
      return {
        name: testCase.name,
        expected_code: testCase.expected_code,
        expected_reason: testCase.expected_reason,
        code: RAW_VERIFIER_CODES.SCHEMA_INVALID,
        reason: "duplicate_key",
        accepted: false,
      };
    }
    const result = testCase.schema_owned
      ? validateDfiCertificate(testCase.certificate)
      : privacyGate(testCase.certificate);
    return {
      name: testCase.name,
      expected_code: testCase.expected_code,
      expected_reason: testCase.expected_reason,
      code: result.code ?? (result.ok ? RAW_VERIFIER_CODES.OK : RAW_VERIFIER_CODES.SCHEMA_INVALID),
      reason: result.reason ?? null,
      accepted: result.ok,
      covert_capacity_bits: result.covert_capacity_bits ?? null,
    };
  });
  return {
    stage: "4H.3",
    gate: "Q7",
    status: results.every(
      (result) => result.code === result.expected_code && result.reason === result.expected_reason
    )
      ? "pass"
      : "fail",
    bounded_leakage: true,
    allowlist: "authoritative_schema_plus_q7_defence_in_depth",
    results,
    accepted_negative_count: results.filter((result) => result.name !== "clean" && result.accepted)
      .length,
  };
}

export async function main({ root = process.cwd() } = {}) {
  const pack = await readJson(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.json"));
  const signature = (
    await readFile(join(root, STAGE4D_EVIDENCE_DIR, "evidence-pack.sig"), "utf8")
  ).trim();
  const signerPub = await readFile(join(root, STAGE4D_EVIDENCE_DIR, "signer.pub"), "utf8");
  const manifestPrivateKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"),
    "utf8"
  );
  const manifestPublicKeyPem = await readFile(
    join(root, "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-public.pem"),
    "utf8"
  );
  const manifestPrivateKey = createPrivateKey(manifestPrivateKeyPem);
  const manifestPublicKey = createPublicKey(manifestPublicKeyPem);
  const fixtureRoot = join(root, "tests/fixtures/llmShield/stage4h");

  const stage4dPrivateKey = createPrivateKey(manifestPrivateKeyPem);
  const stage4dPublicKey = createPublicKey(manifestPublicKeyPem);
  const q1Clean = buildSignedStage4dPack({
    runRecord: stage4dRunRecord({ runId: "stage4h1-q1-clean", sourceLabel: "trusted" }),
    privateKey: stage4dPrivateKey,
    publicKey: stage4dPublicKey,
  });
  const realDirtyApplicable = hasNormalizedUnsafeAuthorityFlow(pack);
  const q1Dirty = realDirtyApplicable
    ? { pack, signature, publicKeyPem: signerPub }
    : buildSignedStage4dPack({
        runRecord: stage4dRunRecord({
          runId: "stage4h1-q1-dirty",
          sourceLabel: "untrusted_web",
        }),
        privateKey: stage4dPrivateKey,
        publicKey: stage4dPublicKey,
      });
  const q0Clean = buildSignedStage4dPack({
    runRecord: stage4h2DiscriminationRunRecord({
      runId: "q0-clean-disconnected-untrusted",
      dirty: false,
    }),
    privateKey: stage4dPrivateKey,
    publicKey: stage4dPublicKey,
  });
  const q4Dirty = buildSignedStage4dPack({
    runRecord: stage4h2DiscriminationRunRecord({
      runId: "q4-dirty-one-edge-delta",
      dirty: true,
    }),
    privateKey: stage4dPrivateKey,
    publicKey: stage4dPublicKey,
  });

  const q0Certificate = buildDfiCertificate({ pack: q0Clean.pack });
  const q0Manifest = signManifest(q0Certificate, manifestPrivateKey);
  const q4DirtyCertificate = buildDfiCertificate({ pack: q4Dirty.pack });
  const q4DirtyManifest = signManifest(q4DirtyCertificate, manifestPrivateKey);

  const q4aForgedPremiseDigestCertificate = structuredClone(q4DirtyCertificate);
  q4aForgedPremiseDigestCertificate.premise_digest = q0Certificate.premise_digest;
  const q4aForgedPremiseDigestManifest = signManifest(
    q4aForgedPremiseDigestCertificate,
    manifestPrivateKey
  );

  const q4bForgedSafeCertificate = structuredClone(q4DirtyCertificate);
  for (const claim of q4bForgedSafeCertificate.derivation.sink_safety_claims) {
    if (claim.node === "action:act_001") {
      claim.safe = true;
    }
  }
  q4bForgedSafeCertificate.summary.violations = 0;
  const q4bForgedSafeManifest = signManifest(q4bForgedSafeCertificate, manifestPrivateKey);

  const q4cPartialOmissionCertificate = structuredClone(q4DirtyCertificate);
  q4cPartialOmissionCertificate.derivation.lattice_steps =
    q4cPartialOmissionCertificate.derivation.lattice_steps.filter(
      (step) => step.node !== "action:act_001"
    );
  const q4cPartialOmissionManifest = signManifest(
    q4cPartialOmissionCertificate,
    manifestPrivateKey
  );

  const q1CleanCertificate = buildDfiCertificate({ pack: q1Clean.pack });
  const q1CleanManifest = signManifest(q1CleanCertificate, manifestPrivateKey);
  const forgedPremiseDigestCertificate = {
    ...q1CleanCertificate,
    premise_digest: `sha256:${"0".repeat(64)}`,
  };
  const forgedPremiseDigestManifest = signManifest(
    forgedPremiseDigestCertificate,
    manifestPrivateKey
  );
  const malformedCertificate = { ...q1CleanCertificate, unexpected: true };
  const tamperedBasePack = {
    ...q1Clean.pack,
    run_manifest: { ...q1Clean.pack.run_manifest, stage4h_tamper: true },
  };
  const binding = verifyPackBinding({
    certificate: q1CleanCertificate,
    manifest: q1CleanManifest,
    publicKey: manifestPublicKey,
  });
  const q2q5Results = {
    ok: binding.ok,
    code: binding.ok ? RAW_VERIFIER_CODES.OK : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
    stage4_code: stage4CodeForRawCode(binding.ok ? 0 : RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH),
    gate: "Q2/Q5",
    certificate_digest: certificateDigest(q1CleanCertificate),
    premise_digest: q1CleanCertificate.premise_digest,
    base_pack_digest: q1CleanCertificate.base_pack_digest,
  };
  const q1DirtyCertificate = buildDfiCertificate({ pack: q1Dirty.pack });
  const q1DirtyManifest = signManifest(q1DirtyCertificate, manifestPrivateKey);

  const q1ForgedSafeDirtyCertificate = structuredClone(q1DirtyCertificate);
  for (const claim of q1ForgedSafeDirtyCertificate.derivation.sink_safety_claims) {
    if (claim.safe === false) {
      claim.node_label = "untrusted";
      claim.safe = true;
    }
  }
  q1ForgedSafeDirtyCertificate.summary.violations = 0;
  const q1ForgedSafeDirtyManifest = signManifest(q1ForgedSafeDirtyCertificate, manifestPrivateKey);

  const q1StrippedDerivedLabelsCertificate = structuredClone(q1CleanCertificate);
  q1StrippedDerivedLabelsCertificate.derivation.derived_node_labels = [];
  const q1StrippedDerivedLabelsManifest = signManifest(
    q1StrippedDerivedLabelsCertificate,
    manifestPrivateKey
  );

  const q1StrippedLatticeStepsCertificate = structuredClone(q1CleanCertificate);
  q1StrippedLatticeStepsCertificate.derivation.lattice_steps = [];
  const q1StrippedLatticeStepsManifest = signManifest(
    q1StrippedLatticeStepsCertificate,
    manifestPrivateKey
  );

  const q1StrippedSinkClaimsCertificate = structuredClone(q1CleanCertificate);
  q1StrippedSinkClaimsCertificate.derivation.sink_safety_claims = [];
  const q1StrippedSinkClaimsManifest = signManifest(
    q1StrippedSinkClaimsCertificate,
    manifestPrivateKey
  );

  const q1UnboundCertificateMutation = structuredClone(q1CleanCertificate);
  q1UnboundCertificateMutation.summary.sources_checked += 1;

  await writeJson(join(fixtureRoot, "clean-base-pack.json"), q1Clean.pack);
  await writeJson(join(fixtureRoot, "tampered-base-pack.json"), tamperedBasePack);
  await writeFile(join(fixtureRoot, "clean-base-pack.sig"), `${q1Clean.signature.trim()}\n`);
  await writeFile(join(fixtureRoot, "wrong-base-pack.sig"), "base64:ZmFrZQ==\n");
  await writeFile(join(fixtureRoot, "clean-signer.pub"), q1Clean.publicKeyPem);
  await writeFile(join(fixtureRoot, "wrong-base-pack.pub"), WRONG_BASE_PACK_PUBLIC_KEY_PEM);
  await writeJson(join(fixtureRoot, "clean-dfi-certificate.json"), q1CleanCertificate);
  await writeJson(join(fixtureRoot, "malformed-certificate.json"), malformedCertificate);
  await writeJson(join(fixtureRoot, "clean-signed-pack-manifest.json"), q1CleanManifest);
  await writeFile(join(fixtureRoot, "manifest-verifier.pub"), manifestPublicKeyPem);
  await writeJson(
    join(fixtureRoot, "forged-premise-digest-certificate.json"),
    forgedPremiseDigestCertificate
  );
  await writeJson(
    join(fixtureRoot, "forged-premise-digest-signed-pack-manifest.json"),
    forgedPremiseDigestManifest
  );
  await writeJson(join(fixtureRoot, "expected-results/q2-q5-results.json"), q2q5Results);

  await writeJson(join(fixtureRoot, "q1-clean-base-pack.json"), q1Clean.pack);
  await writeFile(join(fixtureRoot, "q1-clean-base-pack.sig"), `${q1Clean.signature.trim()}\n`);
  await writeFile(join(fixtureRoot, "q1-clean-signer.pub"), q1Clean.publicKeyPem);
  await writeJson(join(fixtureRoot, "q1-clean-dfi-certificate.json"), q1CleanCertificate);
  await writeJson(join(fixtureRoot, "q1-clean-signed-pack-manifest.json"), q1CleanManifest);

  await writeJson(join(fixtureRoot, "q1-real-dirty-base-pack.json"), q1Dirty.pack);
  await writeFile(
    join(fixtureRoot, "q1-real-dirty-base-pack.sig"),
    `${q1Dirty.signature.trim()}\n`
  );
  await writeFile(join(fixtureRoot, "q1-real-dirty-signer.pub"), q1Dirty.publicKeyPem);
  await writeJson(join(fixtureRoot, "q1-real-dirty-dfi-certificate.json"), q1DirtyCertificate);
  await writeJson(join(fixtureRoot, "q1-real-dirty-signed-pack-manifest.json"), q1DirtyManifest);

  await writeJson(
    join(fixtureRoot, "q1-forged-safe-dirty-certificate.json"),
    q1ForgedSafeDirtyCertificate
  );
  await writeJson(
    join(fixtureRoot, "q1-forged-safe-dirty-signed-pack-manifest.json"),
    q1ForgedSafeDirtyManifest
  );

  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-derived-labels-certificate.json"),
    q1StrippedDerivedLabelsCertificate
  );
  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-derived-labels-signed-pack-manifest.json"),
    q1StrippedDerivedLabelsManifest
  );
  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-lattice-steps-certificate.json"),
    q1StrippedLatticeStepsCertificate
  );
  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-lattice-steps-signed-pack-manifest.json"),
    q1StrippedLatticeStepsManifest
  );
  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-sink-claims-certificate.json"),
    q1StrippedSinkClaimsCertificate
  );
  await writeJson(
    join(fixtureRoot, "q1-theatre-stripped-sink-claims-signed-pack-manifest.json"),
    q1StrippedSinkClaimsManifest
  );
  await writeJson(
    join(fixtureRoot, "q1-unbound-certificate-mutation-certificate.json"),
    q1UnboundCertificateMutation
  );

  await writeJson(
    join(fixtureRoot, "q0-clean-disconnected-untrusted-base-pack.json"),
    q0Clean.pack
  );
  await writeFile(
    join(fixtureRoot, "q0-clean-disconnected-untrusted-base-pack.sig"),
    `${q0Clean.signature.trim()}\n`
  );
  await writeFile(
    join(fixtureRoot, "q0-clean-disconnected-untrusted-signer.pub"),
    q0Clean.publicKeyPem
  );
  await writeJson(
    join(fixtureRoot, "q0-clean-disconnected-untrusted-dfi-certificate.json"),
    q0Certificate
  );
  await writeJson(
    join(fixtureRoot, "q0-clean-disconnected-untrusted-signed-pack-manifest.json"),
    q0Manifest
  );

  await writeJson(join(fixtureRoot, "q4-dirty-one-edge-delta-base-pack.json"), q4Dirty.pack);
  await writeFile(
    join(fixtureRoot, "q4-dirty-one-edge-delta-base-pack.sig"),
    `${q4Dirty.signature.trim()}\n`
  );
  await writeFile(join(fixtureRoot, "q4-dirty-one-edge-delta-signer.pub"), q4Dirty.publicKeyPem);
  await writeJson(
    join(fixtureRoot, "q4-dirty-one-edge-delta-dfi-certificate.json"),
    q4DirtyCertificate
  );
  await writeJson(
    join(fixtureRoot, "q4-dirty-one-edge-delta-signed-pack-manifest.json"),
    q4DirtyManifest
  );
  await writeJson(
    join(fixtureRoot, "q4a-forged-premise-digest-certificate.json"),
    q4aForgedPremiseDigestCertificate
  );
  await writeJson(
    join(fixtureRoot, "q4a-forged-premise-digest-signed-pack-manifest.json"),
    q4aForgedPremiseDigestManifest
  );
  await writeJson(
    join(fixtureRoot, "q4b-clean-derivation-over-dirty-replay-certificate.json"),
    q4bForgedSafeCertificate
  );
  await writeJson(
    join(fixtureRoot, "q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json"),
    q4bForgedSafeManifest
  );
  await writeJson(
    join(fixtureRoot, "q4c-derivation-scope-omission-certificate.json"),
    q4cPartialOmissionCertificate
  );
  await writeJson(
    join(fixtureRoot, "q4c-derivation-scope-omission-signed-pack-manifest.json"),
    q4cPartialOmissionManifest
  );

  const manifestPub = join(fixtureRoot, "manifest-verifier.pub");
  const cliCases = [
    {
      out: "q1-clean-cli-results.json",
      code: RAW_VERIFIER_CODES.OK,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-clean-dfi-certificate.json",
      manifest: "q1-clean-signed-pack-manifest.json",
    },
    {
      out: "q1-real-dirty-cli-results.json",
      code: RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      base: "q1-real-dirty-base-pack.json",
      sig: "q1-real-dirty-base-pack.sig",
      pub: "q1-real-dirty-signer.pub",
      cert: "q1-real-dirty-dfi-certificate.json",
      manifest: "q1-real-dirty-signed-pack-manifest.json",
    },
    {
      out: "q1-forged-safe-cli-results.json",
      code: RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      base: "q1-real-dirty-base-pack.json",
      sig: "q1-real-dirty-base-pack.sig",
      pub: "q1-real-dirty-signer.pub",
      cert: "q1-forged-safe-dirty-certificate.json",
      manifest: "q1-forged-safe-dirty-signed-pack-manifest.json",
    },
    {
      out: "q1-theatre-stripped-derived-labels-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-theatre-stripped-derived-labels-certificate.json",
      manifest: "q1-theatre-stripped-derived-labels-signed-pack-manifest.json",
    },
    {
      out: "q1-theatre-stripped-lattice-steps-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-theatre-stripped-lattice-steps-certificate.json",
      manifest: "q1-theatre-stripped-lattice-steps-signed-pack-manifest.json",
    },
    {
      out: "q1-theatre-stripped-sink-claims-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-theatre-stripped-sink-claims-certificate.json",
      manifest: "q1-theatre-stripped-sink-claims-signed-pack-manifest.json",
    },
    {
      out: "q1-unbound-certificate-mutation-cli-results.json",
      code: RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-unbound-certificate-mutation-certificate.json",
      manifest: "q1-clean-signed-pack-manifest.json",
    },
    {
      out: "q0-clean-disconnected-untrusted-cli-results.json",
      code: RAW_VERIFIER_CODES.OK,
      base: "q0-clean-disconnected-untrusted-base-pack.json",
      sig: "q0-clean-disconnected-untrusted-base-pack.sig",
      pub: "q0-clean-disconnected-untrusted-signer.pub",
      cert: "q0-clean-disconnected-untrusted-dfi-certificate.json",
      manifest: "q0-clean-disconnected-untrusted-signed-pack-manifest.json",
    },
    {
      out: "q4a-forged-premise-digest-cli-results.json",
      code: RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      base: "q4-dirty-one-edge-delta-base-pack.json",
      sig: "q4-dirty-one-edge-delta-base-pack.sig",
      pub: "q4-dirty-one-edge-delta-signer.pub",
      cert: "q4a-forged-premise-digest-certificate.json",
      manifest: "q4a-forged-premise-digest-signed-pack-manifest.json",
    },
    {
      out: "q4b-clean-derivation-over-dirty-replay-cli-results.json",
      code: RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      base: "q4-dirty-one-edge-delta-base-pack.json",
      sig: "q4-dirty-one-edge-delta-base-pack.sig",
      pub: "q4-dirty-one-edge-delta-signer.pub",
      cert: "q4b-clean-derivation-over-dirty-replay-certificate.json",
      manifest: "q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json",
    },
    {
      out: "q4c-derivation-scope-omission-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      base: "q4-dirty-one-edge-delta-base-pack.json",
      sig: "q4-dirty-one-edge-delta-base-pack.sig",
      pub: "q4-dirty-one-edge-delta-signer.pub",
      cert: "q4c-derivation-scope-omission-certificate.json",
      manifest: "q4c-derivation-scope-omission-signed-pack-manifest.json",
    },
  ];

  for (const testCase of cliCases) {
    await runCliFixture(
      [
        "--base-pack",
        join(fixtureRoot, testCase.base),
        "--base-pack-sig",
        join(fixtureRoot, testCase.sig),
        "--base-pack-pubkey",
        join(fixtureRoot, testCase.pub),
        "--certificate",
        join(fixtureRoot, testCase.cert),
        "--manifest",
        join(fixtureRoot, testCase.manifest),
        "--manifest-pubkey",
        manifestPub,
        "--out",
        join(fixtureRoot, "expected-results", testCase.out),
      ],
      testCase.code
    );
  }

  const verifierResults = await readJson(
    join(fixtureRoot, "expected-results/q0-clean-disconnected-untrusted-cli-results.json")
  );
  const tamperMatrix = {
    stage: "4H.3",
    gate: "Q6",
    evidence_generation:
      "generated by buildTamperMatrix using the shared diagnose() first-failing-step engine",
    ...buildTamperMatrix({ pack: q0Clean.pack, certificate: q0Certificate, manifest: q0Manifest }),
  };
  const privacyMatrix = buildPrivacyMatrix(q0Certificate);
  const q1ExpectedResults = {
    "q1-clean": RAW_VERIFIER_CODES.OK,
    "q1-real-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    "q1-forged-safe-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    "q1-theatre-stripped-derived-labels": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
    "q1-theatre-stripped-lattice-steps": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
    "q1-theatre-stripped-sink-claims": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
    "q1-unbound-certificate-mutation": RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
  };
  const q0ExpectedResults = {
    "q0-clean-disconnected-untrusted": RAW_VERIFIER_CODES.OK,
  };
  const q4ExpectedResults = {
    "q4a-forged-premise-digest": RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
    "q4b-clean-derivation-over-dirty-replay": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    "q4c-derivation-scope-omission": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
  };
  await writeJson(join(fixtureRoot, "expected-results/discrimination-results.json"), {
    stage: "4H.2",
    gate: "Q0/Q4",
    expected_results: {
      Q0: q0ExpectedResults,
      Q4: q4ExpectedResults,
    },
    reasons: {
      "q4a-forged-premise-digest": "premise_digest_mismatch",
      "q4b-clean-derivation-over-dirty-replay": "proof_accepts_bad_flow",
      "q4c-derivation-scope-omission": "derivation_scope_incomplete",
    },
  });
  const qGateResults = {
    stage: "4H.3",
    status: "tamper_closure_and_privacy",
    gates: {
      Q0: { status: "pass", expected_results: q0ExpectedResults },
      Q1: { status: "pass", expected_results: q1ExpectedResults },
      Q2: { status: "pass", raw_verifier_code: 0 },
      Q3: { status: "not_in_scope" },
      Q4: { status: "pass", expected_results: q4ExpectedResults },
      Q5: { status: "pass", raw_verifier_code: 0 },
      Q6: {
        status: tamperMatrix.tampered_accepted_count === 0 ? "pass" : "fail",
        tampered_accepted_count: tamperMatrix.tampered_accepted_count,
        expected_results: Object.fromEntries(
          tamperMatrix.results.map((result) => [result.arm, result.expected_code])
        ),
      },
      Q7: {
        status: privacyMatrix.status,
        bounded_leakage: privacyMatrix.bounded_leakage,
        allowlist: privacyMatrix.allowlist,
        accepted_negative_count: privacyMatrix.accepted_negative_count,
        expected_results: Object.fromEntries(
          privacyMatrix.results.map((result) => [result.name, result.expected_code])
        ),
      },
    },
    q0_positive_base_pack: "q0-clean-disconnected-untrusted-base-pack.json",
    q1_positive_base_pack: "q1-clean-base-pack.json",
    q1_dirty_base_pack: "q1-real-dirty-base-pack.json",
    q1_dirty_source: realDirtyApplicable ? "real_stage4d_pack" : "synthetic_replacement",
    q4_dirty_base_pack: "q4-dirty-one-edge-delta-base-pack.json",
    q4_boundary: {
      q4a: "forged clean premise digest over dirty replay fails Q2 with raw 22",
      q4b: "structurally complete forged-safe derivation over honest dirty premises fails sink-safety with raw 24",
      q4c: "true partial derivation omission over honest dirty premises fails coverage with raw 26",
      one_edge_delta:
        "the only Stage 4H DFI/canonical-premise difference is the added untrusted source edge into action:act_001; directly mirrored summary metadata may differ only to truthfully reflect the same source-set change",
    },
    non_claims: [
      "implicit_flow_security",
      "control_dependence_security",
      "model_safety",
      "execution_truth",
      "provider_behaviour_correctness",
      "future_run_guarantees",
      "full_stage_4h_completion",
      "public_priority",
      "jailbreak_immunity",
      "general_jailbreak_resistance",
      "production_readiness",
    ],
  };
  const e2eSmokeCoverage = {
    stage: "4H.3",
    scope: "Q0/Q1/Q2/Q4/Q5 plus Q6/Q7 bounded evidence smoke",
    modules_exercised: [
      "constants.mjs",
      "schema.mjs",
      "canonicalPremises.mjs",
      "packBinding.mjs",
      "dfiCertificate.mjs",
      "verify-stage4h-digest-binding.mjs",
      "build-stage4h-digest-fixtures.mjs",
      "exitCodes.mjs",
      "tamperClosure.mjs",
      "privacyGate.mjs",
    ],
    functions_exercised: [
      "validateDfiCertificate",
      "buildPremiseSet",
      "premiseDigest",
      "verifyPackBinding",
      "buildDfiCertificate",
      "certificateDigest",
      "normalizeIntegrityLabel",
      "combineIntegrity",
      "integrityLte",
      "recomputeGraph",
      "buildDerivation",
      "validateDerivation",
      "stage4CodeForRawCode",
      "verify-stage4h-digest-binding CLI",
      "build-stage4h-digest-fixtures builder",
      "diagnose",
      "buildTamperMatrix",
      "privacyGate",
    ],
    fixture_matrix: {
      "4h0-clean": RAW_VERIFIER_CODES.OK,
      "q1-clean": RAW_VERIFIER_CODES.OK,
      "q1-real-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      "q1-forged-safe-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      "q1-theatre-stripped-derived-labels": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      "q1-theatre-stripped-lattice-steps": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      "q1-theatre-stripped-sink-claims": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      "q1-unbound-certificate-mutation": RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
      "q0-clean-disconnected-untrusted": RAW_VERIFIER_CODES.OK,
      "q4a-forged-premise-digest": RAW_VERIFIER_CODES.PREMISE_DIGEST_MISMATCH,
      "q4b-clean-derivation-over-dirty-replay":
        RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      "q4c-derivation-scope-omission": RAW_VERIFIER_CODES.PROOF_STRUCTURE_INVALID,
      ...Object.fromEntries(
        tamperMatrix.results.map((result) => [`q6-${result.arm}`, result.expected_code])
      ),
      ...Object.fromEntries(
        privacyMatrix.results.map((result) => [`q7-${result.name}`, result.expected_code])
      ),
    },
    non_scope_gates: ["Q3"],
    metadata_only: true,
  };

  await writeJson(join(fixtureRoot, "expected-results/tamper-matrix.json"), tamperMatrix);
  await writeJson(join(fixtureRoot, "expected-results/privacy-matrix.json"), privacyMatrix);
  await writeJson(join(fixtureRoot, "tamper/q6-clean-context.json"), buildCleanTamperContext());
  await writeJson(join(fixtureRoot, "privacy/q7-clean-certificate.json"), q0Certificate);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "certificate.json"), q0Certificate);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "signed-pack-manifest.json"), q0Manifest);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "verifier-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "q-gate-results.json"), qGateResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "e2e-smoke-coverage.json"), e2eSmokeCoverage);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "tamper-results.json"), tamperMatrix);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "privacy-report.json"), privacyMatrix);
  await writeFile(
    join(root, STAGE4H_EVIDENCE_DIR, "README.md"),
    "# Stage 4H Evidence\n\nStage 4H.3 evidence covers Q6 single-delta tamper closure and Q7 bounded-capacity privacy, while preserving the Stage 4H.2 Q0/Q4 verifier-discrimination matrix, the Stage 4H.1 Q1 explicit-flow derivation validator, and the Stage 4H.0 Q2/Q5 digest/binding foundation. Q3 remains not in scope for 4H.3. This evidence does not claim full Stage 4H completion, implicit-flow security, model safety, jailbreak immunity, or production readiness.\n"
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h fixture build: ${error.message}`);
    process.exit(29);
  });
}
