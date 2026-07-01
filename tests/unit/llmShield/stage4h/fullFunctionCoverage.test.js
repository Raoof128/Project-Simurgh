// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  basePackView,
  buildPremiseSet,
  digest,
  premiseDigest,
  premiseId,
} from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";
import {
  CHECKER_VERSION,
  CLAIM,
  INTEGRITY_LABELS,
  INTEGRITY_LATTICE_DIGEST,
  REQUIRED_SINK_INTEGRITY,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  buildDerivation,
  buildDfiCertificate,
  certificateDigest,
  checkBinding,
  checkLatticeDigest,
  combineIntegrity,
  diagnose,
  integrityLte,
  normalizeIntegrityLabel,
  recomputeGraph,
  validateDerivation,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  RAW_VERIFIER_CODES,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  OfflineViolationError,
  runOffline,
  scanForModelClients,
} from "../../../../tools/simurgh-attestation/stage4h/offlineHarness.mjs";
import { verifyPackBinding } from "../../../../tools/simurgh-attestation/stage4h/packBinding.mjs";
import {
  allowedKeysByPath,
  covertCapacityBits,
  privacyGate,
} from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import {
  isSha256Digest,
  validateDfiCertificate,
  validateJsonTextNoDuplicateKeys,
  validateSignedPackManifest,
} from "../../../../tools/simurgh-attestation/stage4h/schema.mjs";
import {
  applyMutation,
  buildCleanTamperContext,
  buildProofDeletionClosureFixture,
  buildTamperMatrix,
  bumpDigest,
  mutationFamily,
} from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";
import { runVerifierCore } from "../../../../tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";

const expectedPublicExports = Object.freeze({
  canonicalPremises: ["basePackView", "buildPremiseSet", "digest", "premiseDigest", "premiseId"],
  constants: [
    "CERTIFICATE_TYPE",
    "CHECKER_VERSION",
    "CLAIM",
    "DEFAULT_SCOPE",
    "INTEGRITY_LABELS",
    "INTEGRITY_LATTICE",
    "INTEGRITY_LATTICE_DIGEST",
    "MANIFEST_DOMAIN",
    "MANIFEST_VERSION",
    "PROOF_SYSTEM",
    "REQUIRED_SINK_INTEGRITY",
    "STAGE4D_EVIDENCE_DIR",
    "STAGE4H_EVIDENCE_DIR",
  ],
  dfiCertificate: [
    "buildDerivation",
    "buildDfiCertificate",
    "certificateDigest",
    "checkBinding",
    "checkLatticeDigest",
    "combineIntegrity",
    "diagnose",
    "integrityLte",
    "normalizeIntegrityLabel",
    "recomputeGraph",
    "validateDerivation",
  ],
  exitCodes: [
    "HARNESS_CODES",
    "OFFLINE_REASONS",
    "PRIVACY_REASONS",
    "PROOF_TAMPER_DETECTED",
    "RAW_VERIFIER_CODES",
    "RUN_LEVEL_BY_RAW",
    "STRUCTURE_REASONS",
    "stage4CodeForRawCode",
  ],
  offlineHarness: [
    "OfflineViolationError",
    "installDenials",
    "restoreDenials",
    "runOffline",
    "scanForModelClients",
  ],
  packBinding: ["buildSignedPackManifest", "verifyPackBinding"],
  privacyGate: ["allowedKeysByPath", "covertCapacityBits", "privacyGate"],
  schema: [
    "CERTIFICATE_ALLOWED_KEYS",
    "DERIVATION_ALLOWED_KEYS",
    "DERIVED_NODE_LABEL_ALLOWED_KEYS",
    "LATTICE_STEP_ALLOWED_KEYS",
    "SINK_SAFETY_CLAIM_ALLOWED_KEYS",
    "isSha256Digest",
    "validateDfiCertificate",
    "validateJsonTextNoDuplicateKeys",
    "validateSignedPackManifest",
  ],
  tamperClosure: [
    "applyMutation",
    "buildCleanTamperContext",
    "buildProofDeletionClosureFixture",
    "buildTamperMatrix",
    "bumpDigest",
    "mutationFamily",
  ],
  verifierCli: ["main", "runVerifierCore"],
});

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cleanPack() {
  return readJson(`${fixtureRoot}/q1-clean-base-pack.json`);
}

function cleanCertificate() {
  return readJson(`${fixtureRoot}/q1-clean-dfi-certificate.json`);
}

function cleanManifest() {
  return readJson(`${fixtureRoot}/q1-clean-signed-pack-manifest.json`);
}

async function runEgress(surface) {
  return runOffline(async () => {
    const { attemptEgress } =
      await import("../../../fixtures/llmShield/stage4h/offline/egress-double.mjs");
    return attemptEgress(surface);
  });
}

test("Stage 4H public checker surface export inventory is frozen", async () => {
  const modules = {
    canonicalPremises:
      await import("../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs"),
    constants: await import("../../../../tools/simurgh-attestation/stage4h/constants.mjs"),
    dfiCertificate:
      await import("../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs"),
    exitCodes: await import("../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs"),
    offlineHarness:
      await import("../../../../tools/simurgh-attestation/stage4h/offlineHarness.mjs"),
    packBinding: await import("../../../../tools/simurgh-attestation/stage4h/packBinding.mjs"),
    privacyGate: await import("../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs"),
    schema: await import("../../../../tools/simurgh-attestation/stage4h/schema.mjs"),
    tamperClosure: await import("../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs"),
    verifierCli:
      await import("../../../../tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs"),
  };

  for (const [name, expected] of Object.entries(expectedPublicExports)) {
    assert.deepEqual(Object.keys(modules[name]).sort(), [...expected].sort(), name);
  }
});

test("Stage 4H full function coverage exercises canonical premise helpers", () => {
  const pack = cleanPack();
  const view = basePackView(pack);
  const premises = buildPremiseSet(pack);

  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
  assert.equal(premises.sources.length > 0, true);
  assert.match(premiseDigest(premises), /^sha256:[a-f0-9]{64}$/);
  assert.match(premiseId(premises.sources[0]), /^[a-z_]+:sha256:[a-f0-9]{64}$/);

  const noisyPack = { ...pack, ignored_metadata: "not part of view" };
  assert.deepEqual(basePackView(noisyPack), view);
  assert.notEqual(premiseDigest(premises), "sha256:0000");
});

test("Stage 4H full function coverage exercises DFI derivation helpers", () => {
  const pack = cleanPack();
  const premises = buildPremiseSet(pack);
  const certificate = buildDfiCertificate({ pack });
  const derivation = buildDerivation(premises);
  const graph = recomputeGraph(premises);

  assert.equal(CHECKER_VERSION, "4h-v0");
  assert.equal(CLAIM, "explicit_data_flow_integrity");
  assert.deepEqual(INTEGRITY_LABELS, ["trusted", "untrusted"]);
  assert.equal(REQUIRED_SINK_INTEGRITY, "trusted");
  assert.match(INTEGRITY_LATTICE_DIGEST, /^sha256:[a-f0-9]{64}$/);

  assert.equal(normalizeIntegrityLabel("trusted"), "trusted");
  assert.equal(normalizeIntegrityLabel("untrusted_web"), "untrusted");
  assert.equal(combineIntegrity(["trusted", "untrusted"]), "untrusted");
  assert.equal(integrityLte("untrusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "untrusted"), false);
  assert.equal(graph.nodeLabel.size > 0, true);
  assert.equal(derivation.derivation.derived_node_labels.length > 0, true);
  assert.match(certificateDigest(certificate), /^sha256:[a-f0-9]{64}$/);

  assert.equal(checkLatticeDigest(certificate, certificate.lattice_digest).ok, true);
  assert.equal(
    checkLatticeDigest(certificate, bumpDigest(certificate.lattice_digest)).reason,
    "lattice_digest_mismatch"
  );

  assert.equal(validateDerivation({ premises, certificate }).ok, true);
  const partial = structuredClone(certificate);
  partial.derivation.derived_node_labels = [];
  assert.equal(validateDerivation({ premises, certificate: partial }).code, 26);
});

test("Stage 4H full function coverage exercises schema and binding helpers", () => {
  const certificate = cleanCertificate();
  const manifest = cleanManifest();

  assert.equal(validateJsonTextNoDuplicateKeys('{"a":1,"b":{"a":2}}').ok, true);
  assert.equal(validateJsonTextNoDuplicateKeys('{"a":1,"a":2}').reason, "duplicate_key");
  assert.equal(isSha256Digest(certificateDigest(certificate)), true);
  assert.equal(validateDfiCertificate(certificate).ok, true);
  assert.equal(validateSignedPackManifest(manifest).ok, true);
  assert.equal(checkBinding({ certificate, manifest }).ok, true);
  assert.equal(verifyPackBinding({ certificate, manifest, publicKey: null }).ok, false);

  const tampered = structuredClone(certificate);
  tampered.summary.sources_checked += 1;
  assert.equal(checkBinding({ certificate: tampered, manifest }).reason, "pack_binding_mismatch");
});

test("Stage 4H full function coverage exercises privacy, tamper, and exit helpers", () => {
  const certificate = cleanCertificate();
  const matrix = buildTamperMatrix();
  const arms = mutationFamily().map((arm) => arm.arm);
  const ctx = buildCleanTamperContext();
  const premiseArm = mutationFamily().find((arm) => arm.arm === "premise");
  const mutated = applyMutation(ctx, premiseArm);

  assert.equal(stage4CodeForRawCode(RAW_VERIFIER_CODES.OK), 0);
  assert.equal(stage4CodeForRawCode(RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE), 2);
  assert.equal(stage4CodeForRawCode(9999), 3);
  assert.equal(allowedKeysByPath.certificate.includes("derivation"), true);
  assert.equal(covertCapacityBits(certificate) >= 0, true);

  const privacy = privacyGate(certificate);
  assert.equal(privacy.ok, true);
  assert.equal(privacy.covert_capacity_bits, covertCapacityBits(certificate));
  assert.deepEqual(privacy.auxiliaryFlags, []);

  assert.deepEqual(arms, [
    "sig-byte",
    "merkle-node",
    "binding",
    "policy",
    "premise",
    "lattice-digest",
    "lattice-step",
    "proof-step",
  ]);
  assert.equal(matrix.tampered_accepted_count, 0);
  assert.equal(mutated.diagnosis.code, 22);
  assert.notEqual(mutated.pack, ctx.pack);
});

test("Stage 4H full function coverage exercises offline and CLI-facing helpers", async () => {
  await runOffline(async () => "ok");
  const fetchResult = await runEgress("fetch");
  assert.equal(fetchResult.ok, false);
  assert.equal(fetchResult.code, RAW_VERIFIER_CODES.CHECKER_NOT_OFFLINE);
  assert.equal(fetchResult.reason, "fetch_invoked");

  const tmp = mkdtempSync(join(tmpdir(), "stage4h-full-function-"));
  try {
    const badImport = join(tmp, "bad.mjs");
    writeFileSync(badImport, 'import "node:http";\n');
    const scan = await scanForModelClients(badImport);
    assert.equal(scan.ok, false);
    assert.equal(scan.reason, "forbidden_builtin_imported");
    assert.equal(new OfflineViolationError("fetch_invoked").reason, "fetch_invoked");

    const deletion = buildProofDeletionClosureFixture({ outputDir: tmp });
    const deletedCertificate = readJson(deletion.certificatePath);
    assert.equal(deletedCertificate.derivation.lattice_steps.length, 0);

    const out = join(tmp, "verifier.json");
    const clean = await runVerifierCore({
      argv: [
        "--base-pack",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
        "--base-pack-sig",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
        "--base-pack-pubkey",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
        "--certificate",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`,
        "--manifest",
        `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
        "--manifest-pubkey",
        `${fixtureRoot}/manifest-verifier.pub`,
        "--out",
        out,
      ],
    });
    assert.equal(clean, 0);
    assert.equal(readJson(out).code, 0);

    const diagnosis = diagnose({
      pack: readJson(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`),
      certificate: readJson(
        `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`
      ),
      manifest: readJson(
        `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json`
      ),
    });
    assert.equal(diagnosis.code, 24);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
