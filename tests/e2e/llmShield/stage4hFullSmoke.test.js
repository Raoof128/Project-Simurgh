// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stage4CodeForRawCode } from "../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";
const verifier = "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs";
const builder = "tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs";

function runNode(args) {
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runVerifier({ basePack, basePackSig, basePackPubkey, certificate, manifest, out }) {
  return runNode([
    verifier,
    "--base-pack",
    basePack,
    "--base-pack-sig",
    basePackSig,
    "--base-pack-pubkey",
    basePackPubkey,
    "--certificate",
    certificate,
    "--manifest",
    manifest,
    "--manifest-pubkey",
    `${fixtureRoot}/manifest-verifier.pub`,
    "--out",
    out,
  ]);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assertMetadataOnlyJson(path) {
  const text = readFileSync(path, "utf8");
  const forbidden = [
    /raw_prompt/i,
    /raw_output/i,
    /provider_transcript/i,
    /tool_args/i,
    /OPENAI_API_KEY/i,
    /ANTHROPIC_API_KEY/i,
    /BEGIN PRIVATE KEY/i,
    /\/Users\//,
    /\/home\/[^/\s]+/,
    /stack trace/i,
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(text), false, `${path} does not contain ${pattern}`);
  }
}

test("Stage 4H.2 full reviewer E2E smoke covers builder, CLI, evidence, and Q0/Q4 raw-code matrix", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-e2e-"));
  try {
    const build = runNode([builder]);
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const cases = [
      {
        name: "4h1-clean",
        expectedCode: 0,
        basePack: `${fixtureRoot}/q1-clean-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-clean-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-clean-signer.pub`,
        certificate: `${fixtureRoot}/q1-clean-dfi-certificate.json`,
        manifest: `${fixtureRoot}/q1-clean-signed-pack-manifest.json`,
      },
      {
        name: "4h1-real-dirty",
        expectedCode: 24,
        basePack: `${fixtureRoot}/q1-real-dirty-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-real-dirty-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-real-dirty-signer.pub`,
        certificate: `${fixtureRoot}/q1-real-dirty-dfi-certificate.json`,
        manifest: `${fixtureRoot}/q1-real-dirty-signed-pack-manifest.json`,
      },
      {
        name: "4h1-forged-safe-dirty",
        expectedCode: 24,
        basePack: `${fixtureRoot}/q1-real-dirty-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-real-dirty-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-real-dirty-signer.pub`,
        certificate: `${fixtureRoot}/q1-forged-safe-dirty-certificate.json`,
        manifest: `${fixtureRoot}/q1-forged-safe-dirty-signed-pack-manifest.json`,
      },
      {
        name: "4h1-theatre-stripped-derived-labels",
        expectedCode: 26,
        basePack: `${fixtureRoot}/q1-clean-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-clean-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-clean-signer.pub`,
        certificate: `${fixtureRoot}/q1-theatre-stripped-derived-labels-certificate.json`,
        manifest: `${fixtureRoot}/q1-theatre-stripped-derived-labels-signed-pack-manifest.json`,
      },
      {
        name: "4h1-theatre-stripped-lattice-steps",
        expectedCode: 26,
        basePack: `${fixtureRoot}/q1-clean-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-clean-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-clean-signer.pub`,
        certificate: `${fixtureRoot}/q1-theatre-stripped-lattice-steps-certificate.json`,
        manifest: `${fixtureRoot}/q1-theatre-stripped-lattice-steps-signed-pack-manifest.json`,
      },
      {
        name: "4h1-theatre-stripped-sink-claims",
        expectedCode: 26,
        basePack: `${fixtureRoot}/q1-clean-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-clean-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-clean-signer.pub`,
        certificate: `${fixtureRoot}/q1-theatre-stripped-sink-claims-certificate.json`,
        manifest: `${fixtureRoot}/q1-theatre-stripped-sink-claims-signed-pack-manifest.json`,
      },
      {
        name: "4h1-unbound-certificate-mutation",
        expectedCode: 25,
        basePack: `${fixtureRoot}/q1-clean-base-pack.json`,
        basePackSig: `${fixtureRoot}/q1-clean-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q1-clean-signer.pub`,
        certificate: `${fixtureRoot}/q1-unbound-certificate-mutation-certificate.json`,
        manifest: `${fixtureRoot}/q1-clean-signed-pack-manifest.json`,
      },
      {
        name: "q0-clean-disconnected-untrusted",
        expectedCode: 0,
        basePack: `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
        basePackSig: `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
        certificate: `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`,
        manifest: `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
      },
      {
        name: "q4a-forged-premise-digest",
        expectedCode: 22,
        expectedFalsifier: "premise_digest_mismatch",
        basePack: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`,
        basePackSig: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q4-dirty-one-edge-delta-signer.pub`,
        certificate: `${fixtureRoot}/q4a-forged-premise-digest-certificate.json`,
        manifest: `${fixtureRoot}/q4a-forged-premise-digest-signed-pack-manifest.json`,
      },
      {
        name: "q4b-clean-derivation-over-dirty-replay",
        expectedCode: 24,
        expectedFalsifier: "proof_accepts_bad_flow",
        basePack: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`,
        basePackSig: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q4-dirty-one-edge-delta-signer.pub`,
        certificate: `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`,
        manifest: `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json`,
      },
      {
        name: "q4c-derivation-scope-omission",
        expectedCode: 26,
        expectedFalsifier: "derivation_scope_incomplete",
        basePack: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`,
        basePackSig: `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.sig`,
        basePackPubkey: `${fixtureRoot}/q4-dirty-one-edge-delta-signer.pub`,
        certificate: `${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`,
        manifest: `${fixtureRoot}/q4c-derivation-scope-omission-signed-pack-manifest.json`,
      },
    ];

    for (const fixture of cases) {
      for (const path of [
        fixture.basePack,
        fixture.basePackSig,
        fixture.basePackPubkey,
        fixture.certificate,
        fixture.manifest,
      ]) {
        assert.equal(existsSync(path), true, `${fixture.name}: ${path} exists`);
      }

      const out = join(tmp, `${fixture.name}.json`);
      const result = runVerifier({ ...fixture, out });
      assert.equal(
        result.status,
        stage4CodeForRawCode(fixture.expectedCode),
        `${fixture.name} process exit code\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );

      const json = readJson(out);
      assert.equal(json.code, fixture.expectedCode, `${fixture.name} raw code`);
      if (fixture.expectedFalsifier) {
        assert.equal(json.falsifier, fixture.expectedFalsifier, `${fixture.name} falsifier`);
      }
      assert.equal(typeof json.stage4_code, "number", `${fixture.name} has stage4_code`);
      assert.equal(json.gate, "Q0/Q1/Q2/Q4/Q5", `${fixture.name} gate`);
      assert.match(json.certificate_digest || "", /^sha256:[a-f0-9]{64}$/);
      assert.match(json.base_pack_digest || "", /^sha256:[a-f0-9]{64}$/);
      assertMetadataOnlyJson(out);
    }

    const qGate = readJson(`${evidenceRoot}/q-gate-results.json`);
    assert.equal(qGate.gates.Q1.status, "pass");
    assert.deepEqual(qGate.gates.Q1.expected_results, {
      "q1-clean": 0,
      "q1-real-dirty": 24,
      "q1-forged-safe-dirty": 24,
      "q1-theatre-stripped-derived-labels": 26,
      "q1-theatre-stripped-lattice-steps": 26,
      "q1-theatre-stripped-sink-claims": 26,
      "q1-unbound-certificate-mutation": 25,
    });
    assert.equal(qGate.gates.Q0.status, "pass");
    assert.deepEqual(qGate.gates.Q0.expected_results, {
      "q0-clean-disconnected-untrusted": 0,
    });
    assert.equal(qGate.gates.Q2.status, "pass");
    assert.equal(qGate.gates.Q4.status, "pass");
    assert.deepEqual(qGate.gates.Q4.expected_results, {
      "q4a-forged-premise-digest": 22,
      "q4b-clean-derivation-over-dirty-replay": 24,
      "q4c-derivation-scope-omission": 26,
    });
    assert.equal(qGate.gates.Q5.status, "pass");
    assert.equal(qGate.gates.Q3.status, "pass", "Q3 pass");
    assert.equal(qGate.gates.Q3.clean_run_hits, 0);
    assert.equal(qGate.gates.Q3.egress_double_caught, true);
    assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);
    assert.equal(qGate.gates.Q6.status, "pass");
    assert.equal(qGate.gates.Q6.tampered_accepted_count, 0);
    assert.equal(qGate.gates.Q7.status, "pass");
    assert.equal(qGate.gates.Q7.accepted_negative_count, 0);

    const coverage = readJson(`${evidenceRoot}/e2e-smoke-coverage.json`);
    assert.deepEqual(coverage.fixture_matrix, {
      "4h0-clean": 0,
      "q1-clean": 0,
      "q1-real-dirty": 24,
      "q1-forged-safe-dirty": 24,
      "q1-theatre-stripped-derived-labels": 26,
      "q1-theatre-stripped-lattice-steps": 26,
      "q1-theatre-stripped-sink-claims": 26,
      "q1-unbound-certificate-mutation": 25,
      "q0-clean-disconnected-untrusted": 0,
      "q4a-forged-premise-digest": 22,
      "q4b-clean-derivation-over-dirty-replay": 24,
      "q4c-derivation-scope-omission": 26,
      "q6-sig-byte": "4D_VERIFY_FAILURE",
      "q6-merkle-node": "4D_VERIFY_FAILURE",
      "q6-binding": 25,
      "q6-policy": 23,
      "q6-premise": 22,
      "q6-lattice-digest": 26,
      "q6-lattice-step": 26,
      "q6-proof-step": 26,
      "q7-clean": 0,
      "q7-raw-label": 27,
      "q7-raw-summary": 27,
      "q7-raw-node-id": 27,
      "q7-raw-premise-ref": 27,
      "q7-non-enum-label": 27,
      "q7-unknown-field": 20,
      "q7-duplicate-key": 20,
      "q3-egress-double": 28,
    });
    assert.equal(coverage.metadata_only, true);
    for (const fn of [
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
      "diagnose",
      "buildTamperMatrix",
      "privacyGate",
      "runOffline",
      "scanForModelClients",
    ]) {
      assert.equal(coverage.functions_exercised.includes(fn), true, `${fn} covered`);
    }

    for (const path of [
      `${evidenceRoot}/certificate.json`,
      `${evidenceRoot}/signed-pack-manifest.json`,
      `${evidenceRoot}/verifier-results.json`,
      `${evidenceRoot}/q-gate-results.json`,
      `${evidenceRoot}/e2e-smoke-coverage.json`,
      `${evidenceRoot}/tamper-results.json`,
      `${evidenceRoot}/privacy-report.json`,
      `${evidenceRoot}/offline-report.json`,
      `${evidenceRoot}/hermeticity-attestation.json`,
      `${evidenceRoot}/exit-map.json`,
      `${evidenceRoot}/README.md`,
    ]) {
      assert.equal(existsSync(path), true, `${path} exists`);
      assertMetadataOnlyJson(path);
    }

    const attestation = readJson(`${evidenceRoot}/hermeticity-attestation.json`);
    const offline = readJson(`${evidenceRoot}/offline-report.json`);
    const manifest = readJson(`${evidenceRoot}/signed-pack-manifest.json`);
    assert.equal("hermeticity_attestation_digest" in attestation, false);
    assert.match(offline.hermeticity_attestation_digest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(manifest.hermeticity_attestation_digest, offline.hermeticity_attestation_digest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("Stage 4H.0 compatibility E2E smoke preserves Q2/Q5 digest foundation", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h0-e2e-"));
  try {
    const out = join(tmp, "stage4h0-clean.json");
    const result = runVerifier({
      basePack: `${fixtureRoot}/clean-base-pack.json`,
      basePackSig: `${fixtureRoot}/clean-base-pack.sig`,
      basePackPubkey: `${fixtureRoot}/clean-signer.pub`,
      certificate: `${fixtureRoot}/clean-dfi-certificate.json`,
      manifest: `${fixtureRoot}/clean-signed-pack-manifest.json`,
      out,
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const json = readJson(out);
    assert.equal(json.code, 0);
    assert.match(json.base_pack_digest, /^sha256:[a-f0-9]{64}$/);
    assert.match(json.premise_digest, /^sha256:[a-f0-9]{64}$/);
    assert.match(json.certificate_digest, /^sha256:[a-f0-9]{64}$/);

    const certificate = readJson(`${fixtureRoot}/clean-dfi-certificate.json`);
    assert.equal(Object.hasOwn(certificate, "certificate_digest"), false);
    assertMetadataOnlyJson(out);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("Stage 4H full-chain E2E explicitly covers digest tamper and typed exits", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-explicit-e2e-"));
  try {
    const cleanOut = join(tmp, "stage4h0-clean.json");
    const cleanResult = runVerifier({
      basePack: `${fixtureRoot}/clean-base-pack.json`,
      basePackSig: `${fixtureRoot}/clean-base-pack.sig`,
      basePackPubkey: `${fixtureRoot}/clean-signer.pub`,
      certificate: `${fixtureRoot}/clean-dfi-certificate.json`,
      manifest: `${fixtureRoot}/clean-signed-pack-manifest.json`,
      out: cleanOut,
    });
    assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);
    assert.equal(readJson(cleanOut).code, 0);

    const tamperedOut = join(tmp, "stage4h0-tampered.json");
    const tamperedResult = runVerifier({
      basePack: `${fixtureRoot}/tampered-base-pack.json`,
      basePackSig: `${fixtureRoot}/clean-base-pack.sig`,
      basePackPubkey: `${fixtureRoot}/clean-signer.pub`,
      certificate: `${fixtureRoot}/clean-dfi-certificate.json`,
      manifest: `${fixtureRoot}/clean-signed-pack-manifest.json`,
      out: tamperedOut,
    });
    assert.notEqual(tamperedResult.status, 0);
    assert.notEqual(readJson(tamperedOut).code, 0);

    assert.equal(stage4CodeForRawCode(28), 2);
    assert.equal(stage4CodeForRawCode(29), 3);
    assert.equal(stage4CodeForRawCode(9999), 3);

    const offline = readJson(`${evidenceRoot}/offline-report.json`);
    assert.equal(offline.egress_double_raw_code, 28);
    assert.equal(stage4CodeForRawCode(offline.egress_double_raw_code), 2);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
