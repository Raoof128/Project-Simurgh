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

  const q1CleanCertificate = buildDfiCertificate({ pack: q1Clean.pack });
  const q1CleanManifest = signManifest(q1CleanCertificate, manifestPrivateKey);
  const forgedPremiseDigestCertificate = {
    ...q1CleanCertificate,
    premise_digest: `sha256:${"0".repeat(64)}`,
  };
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
      code: RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-theatre-stripped-derived-labels-certificate.json",
      manifest: "q1-theatre-stripped-derived-labels-signed-pack-manifest.json",
    },
    {
      out: "q1-theatre-stripped-lattice-steps-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
      base: "q1-clean-base-pack.json",
      sig: "q1-clean-base-pack.sig",
      pub: "q1-clean-signer.pub",
      cert: "q1-theatre-stripped-lattice-steps-certificate.json",
      manifest: "q1-theatre-stripped-lattice-steps-signed-pack-manifest.json",
    },
    {
      out: "q1-theatre-stripped-sink-claims-cli-results.json",
      code: RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
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
    join(fixtureRoot, "expected-results/q1-clean-cli-results.json")
  );
  const q1ExpectedResults = {
    "q1-clean": RAW_VERIFIER_CODES.OK,
    "q1-real-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    "q1-forged-safe-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    "q1-theatre-stripped-derived-labels": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
    "q1-theatre-stripped-lattice-steps": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
    "q1-theatre-stripped-sink-claims": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
    "q1-unbound-certificate-mutation": RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
  };
  const qGateResults = {
    stage: "4H.1",
    status: "lattice_derivation_validator",
    gates: {
      Q0: { status: "not_in_scope" },
      Q1: { status: "pass", expected_results: q1ExpectedResults },
      Q2: { status: "pass", raw_verifier_code: 0 },
      Q3: { status: "not_in_scope" },
      Q4: { status: "not_in_scope" },
      Q5: { status: "pass", raw_verifier_code: 0 },
      Q6: { status: "not_in_scope" },
      Q7: { status: "not_in_scope" },
    },
    q1_positive_base_pack: "q1-clean-base-pack.json",
    q1_dirty_base_pack: "q1-real-dirty-base-pack.json",
    q1_dirty_source: realDirtyApplicable ? "real_stage4d_pack" : "synthetic_replacement",
    non_claims: [
      "implicit_flow_security",
      "control_dependence_security",
      "model_safety",
      "execution_truth",
      "provider_behaviour_correctness",
      "future_run_guarantees",
      "public_priority",
    ],
  };
  const e2eSmokeCoverage = {
    stage: "4H.1",
    scope: "Q1/Q2/Q5 full E2E smoke",
    modules_exercised: [
      "constants.mjs",
      "schema.mjs",
      "canonicalPremises.mjs",
      "packBinding.mjs",
      "dfiCertificate.mjs",
      "verify-stage4h-digest-binding.mjs",
      "build-stage4h-digest-fixtures.mjs",
      "exitCodes.mjs",
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
    ],
    fixture_matrix: {
      "4h0-clean": RAW_VERIFIER_CODES.OK,
      "q1-clean": RAW_VERIFIER_CODES.OK,
      "q1-real-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      "q1-forged-safe-dirty": RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
      "q1-theatre-stripped-derived-labels": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
      "q1-theatre-stripped-lattice-steps": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
      "q1-theatre-stripped-sink-claims": RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED,
      "q1-unbound-certificate-mutation": RAW_VERIFIER_CODES.PACK_BINDING_MISMATCH,
    },
    non_scope_gates: ["Q0", "Q3", "Q4", "Q6", "Q7"],
    metadata_only: true,
  };

  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "certificate.json"), q1CleanCertificate);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "signed-pack-manifest.json"), q1CleanManifest);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "verifier-results.json"), verifierResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "q-gate-results.json"), qGateResults);
  await writeJson(join(root, STAGE4H_EVIDENCE_DIR, "e2e-smoke-coverage.json"), e2eSmokeCoverage);
  await writeFile(
    join(root, STAGE4H_EVIDENCE_DIR, "README.md"),
    "# Stage 4H Evidence\n\nStage 4H.1 evidence covers explicit data-flow integrity derivation validation (Q1) plus the Stage 4H.0 digest/binding foundation (Q2/Q5). Q0, Q3, Q4, Q6, and Q7 remain not in scope for 4H.1.\n"
  );
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4h fixture build: ${error.message}`);
    process.exit(29);
  });
}
