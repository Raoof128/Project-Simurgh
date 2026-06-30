// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

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

test("Stage 4H.0/4H.1 full reviewer E2E smoke covers builder, CLI, evidence, and raw-code matrix", () => {
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
        fixture.expectedCode,
        `${fixture.name} process exit code\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );

      const json = readJson(out);
      assert.equal(json.code, fixture.expectedCode, `${fixture.name} raw code`);
      assert.equal(typeof json.stage4_code, "number", `${fixture.name} has stage4_code`);
      assert.equal(json.gate, "Q1/Q2/Q5", `${fixture.name} gate`);
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
    assert.equal(qGate.gates.Q2.status, "pass");
    assert.equal(qGate.gates.Q5.status, "pass");
    for (const gate of ["Q0", "Q3", "Q4", "Q6", "Q7"]) {
      assert.equal(qGate.gates[gate].status, "not_in_scope", `${gate} not in scope`);
    }

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
    ]) {
      assert.equal(coverage.functions_exercised.includes(fn), true, `${fn} covered`);
    }

    for (const path of [
      `${evidenceRoot}/certificate.json`,
      `${evidenceRoot}/signed-pack-manifest.json`,
      `${evidenceRoot}/verifier-results.json`,
      `${evidenceRoot}/q-gate-results.json`,
      `${evidenceRoot}/e2e-smoke-coverage.json`,
      `${evidenceRoot}/README.md`,
    ]) {
      assert.equal(existsSync(path), true, `${path} exists`);
      assertMetadataOnlyJson(path);
    }
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
