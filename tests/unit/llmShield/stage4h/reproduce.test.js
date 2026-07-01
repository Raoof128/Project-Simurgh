// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { runOffline } from "../../../../tools/simurgh-attestation/stage4h/offlineHarness.mjs";
import { privacyGate } from "../../../../tools/simurgh-attestation/stage4h/privacyGate.mjs";
import { buildProofDeletionClosureFixture } from "../../../../tools/simurgh-attestation/stage4h/tamperClosure.mjs";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function runVerifierToJson(args, out) {
  const result = spawnSync(process.execPath, [
    "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
    ...args,
    "--out",
    out,
  ]);
  assert.notEqual(result.status, 0);
  return readJson(out);
}

test("Stage 4H.2 committed fixtures and evidence are present and scoped", () => {
  for (const path of [
    `${fixtureRoot}/clean-base-pack.json`,
    `${fixtureRoot}/tampered-base-pack.json`,
    `${fixtureRoot}/clean-base-pack.sig`,
    `${fixtureRoot}/wrong-base-pack.sig`,
    `${fixtureRoot}/clean-signer.pub`,
    `${fixtureRoot}/wrong-base-pack.pub`,
    `${fixtureRoot}/clean-dfi-certificate.json`,
    `${fixtureRoot}/malformed-certificate.json`,
    `${fixtureRoot}/clean-signed-pack-manifest.json`,
    `${fixtureRoot}/manifest-verifier.pub`,
    `${fixtureRoot}/forged-premise-digest-certificate.json`,
    `${fixtureRoot}/forged-premise-digest-signed-pack-manifest.json`,
    `${fixtureRoot}/expected-results/q2-q5-results.json`,
    `${fixtureRoot}/q1-clean-base-pack.json`,
    `${fixtureRoot}/q1-clean-base-pack.sig`,
    `${fixtureRoot}/q1-clean-signer.pub`,
    `${fixtureRoot}/q1-clean-dfi-certificate.json`,
    `${fixtureRoot}/q1-clean-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-real-dirty-base-pack.json`,
    `${fixtureRoot}/q1-real-dirty-base-pack.sig`,
    `${fixtureRoot}/q1-real-dirty-signer.pub`,
    `${fixtureRoot}/q1-real-dirty-dfi-certificate.json`,
    `${fixtureRoot}/q1-real-dirty-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-forged-safe-dirty-certificate.json`,
    `${fixtureRoot}/q1-forged-safe-dirty-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-theatre-stripped-derived-labels-certificate.json`,
    `${fixtureRoot}/q1-theatre-stripped-derived-labels-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-theatre-stripped-lattice-steps-certificate.json`,
    `${fixtureRoot}/q1-theatre-stripped-lattice-steps-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-theatre-stripped-sink-claims-certificate.json`,
    `${fixtureRoot}/q1-theatre-stripped-sink-claims-signed-pack-manifest.json`,
    `${fixtureRoot}/q1-unbound-certificate-mutation-certificate.json`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.sig`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signer.pub`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-dfi-certificate.json`,
    `${fixtureRoot}/q0-clean-disconnected-untrusted-signed-pack-manifest.json`,
    `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`,
    `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.sig`,
    `${fixtureRoot}/q4-dirty-one-edge-delta-signer.pub`,
    `${fixtureRoot}/q4-dirty-one-edge-delta-dfi-certificate.json`,
    `${fixtureRoot}/q4-dirty-one-edge-delta-signed-pack-manifest.json`,
    `${fixtureRoot}/q4a-forged-premise-digest-certificate.json`,
    `${fixtureRoot}/q4a-forged-premise-digest-signed-pack-manifest.json`,
    `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`,
    `${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-signed-pack-manifest.json`,
    `${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`,
    `${fixtureRoot}/q4c-derivation-scope-omission-signed-pack-manifest.json`,
    `${fixtureRoot}/expected-results/q1-clean-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-real-dirty-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-forged-safe-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-theatre-stripped-derived-labels-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-theatre-stripped-lattice-steps-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-theatre-stripped-sink-claims-cli-results.json`,
    `${fixtureRoot}/expected-results/q1-unbound-certificate-mutation-cli-results.json`,
    `${fixtureRoot}/expected-results/q0-clean-disconnected-untrusted-cli-results.json`,
    `${fixtureRoot}/expected-results/q4a-forged-premise-digest-cli-results.json`,
    `${fixtureRoot}/expected-results/q4b-clean-derivation-over-dirty-replay-cli-results.json`,
    `${fixtureRoot}/expected-results/q4c-derivation-scope-omission-cli-results.json`,
    `${fixtureRoot}/expected-results/tamper-matrix.json`,
    `${fixtureRoot}/expected-results/privacy-matrix.json`,
    `${fixtureRoot}/tamper/q6-clean-context.json`,
    `${fixtureRoot}/privacy/q7-clean-certificate.json`,
    `${fixtureRoot}/expected-results/discrimination-results.json`,
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
  assert.equal(qGate.gates.Q6.status, "pass");
  assert.equal(qGate.gates.Q6.tampered_accepted_count, 0);
  assert.equal(qGate.gates.Q7.status, "pass");
  assert.equal(qGate.gates.Q7.accepted_negative_count, 0);
  assert.equal(qGate.gates.Q3.status, "pass");
  assert.equal(qGate.gates.Q3.clean_run_hits, 0);
  assert.equal(qGate.gates.Q3.egress_double_caught, true);
  assert.equal(qGate.gates.Q3.egress_double_raw_code, 28);

  const tamper = readJson(`${evidenceRoot}/tamper-results.json`);
  assert.equal(tamper.stage, "4H.3");
  assert.equal(tamper.gate, "Q6");
  assert.equal(tamper.tampered_accepted_count, 0);
  assert.deepEqual(
    tamper.results.map((result) => result.arm),
    [
      "sig-byte",
      "merkle-node",
      "binding",
      "policy",
      "premise",
      "lattice-digest",
      "lattice-step",
      "proof-step",
    ]
  );

  const privacy = readJson(`${evidenceRoot}/privacy-report.json`);
  assert.equal(privacy.stage, "4H.3");
  assert.equal(privacy.gate, "Q7");
  assert.equal(privacy.status, "pass");
  assert.equal(privacy.accepted_negative_count, 0);
  assert.equal(
    privacy.results.some((result) => result.name === "unknown-field" && result.code === 20),
    true
  );

  const offline = readJson(`${evidenceRoot}/offline-report.json`);
  assert.equal(offline.q3_status, "pass");
  assert.equal(offline.clean_run_hits, 0);
  assert.equal(offline.egress_double_caught, true);
  assert.match(offline.hermeticity_attestation_digest, /^sha256:[a-f0-9]{64}$/);

  const attestation = readJson(`${evidenceRoot}/hermeticity-attestation.json`);
  assert.equal("hermeticity_attestation_digest" in attestation, false);

  const exitMap = readJson(`${evidenceRoot}/exit-map.json`);
  assert.equal(exitMap.unknown_raw_maps_to, 3);
});

test("Stage 4H.2 committed fixtures and evidence are metadata-only", () => {
  const haystack = [
    readFileSync(`${fixtureRoot}/clean-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/clean-dfi-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/forged-premise-digest-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q1-clean-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q1-clean-dfi-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q1-real-dirty-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q1-real-dirty-dfi-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q1-forged-safe-dirty-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q0-clean-disconnected-untrusted-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q4a-forged-premise-digest-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q4b-clean-derivation-over-dirty-replay-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/q4c-derivation-scope-omission-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/expected-results/discrimination-results.json`, "utf8"),
    readFileSync(`${fixtureRoot}/expected-results/q1-clean-cli-results.json`, "utf8"),
    readFileSync(`${fixtureRoot}/expected-results/q1-real-dirty-cli-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/verifier-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/e2e-smoke-coverage.json`, "utf8"),
    readFileSync(`${evidenceRoot}/tamper-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/privacy-report.json`, "utf8"),
  ].join("\n");
  for (const forbidden of [
    "raw_prompt",
    "raw_output",
    "tool_args",
    "provider_transcript",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "/Users/",
  ]) {
    assert.equal(haystack.includes(forbidden), false, `${forbidden} absent`);
  }
});

test("Stage 4H.2 verifier CLI accepts committed Q0 clean fixture", () => {
  const output = execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
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
      `${fixtureRoot}/expected-results/cli-smoke-results.json`,
    ],
    { encoding: "utf8" }
  );
  assert.match(output, /Stage 4H\.5 verifier: PASS/);
});

test("Stage 4H.2 expected results use the locked raw codes", () => {
  const expected = {
    "q1-clean-cli-results.json": 0,
    "q1-real-dirty-cli-results.json": 24,
    "q1-forged-safe-cli-results.json": 24,
    "q1-theatre-stripped-derived-labels-cli-results.json": 26,
    "q1-theatre-stripped-lattice-steps-cli-results.json": 26,
    "q1-theatre-stripped-sink-claims-cli-results.json": 26,
    "q1-unbound-certificate-mutation-cli-results.json": 25,
    "q0-clean-disconnected-untrusted-cli-results.json": 0,
    "q4a-forged-premise-digest-cli-results.json": 22,
    "q4b-clean-derivation-over-dirty-replay-cli-results.json": 24,
    "q4c-derivation-scope-omission-cli-results.json": 26,
  };
  for (const [file, code] of Object.entries(expected)) {
    const result = readJson(`${fixtureRoot}/expected-results/${file}`);
    assert.equal(result.code, code, file);
  }

  const expectedReasons = {
    "q4a-forged-premise-digest-cli-results.json": "premise_digest_mismatch",
    "q4b-clean-derivation-over-dirty-replay-cli-results.json": "proof_accepts_bad_flow",
    "q4c-derivation-scope-omission-cli-results.json": "derivation_scope_incomplete",
  };
  for (const [file, reason] of Object.entries(expectedReasons)) {
    const result = readJson(`${fixtureRoot}/expected-results/${file}`);
    assert.equal(result.falsifier, reason, file);
  }
});

test("Stage 4H.2 evidence does not claim broader or out-of-scope gates", () => {
  const haystack = [
    readFileSync(`${evidenceRoot}/README.md`, "utf8"),
    readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/verifier-results.json`, "utf8"),
  ].join("\n");
  for (const forbidden of [
    "first proof",
    "public priority",
    "jailbreak-proof",
    "jailbreak resistance",
    "model-safe",
    "proves execution truth",
    "guarantees future runs",
    "full non-interference",
    "implicit-flow proof",
  ]) {
    assert.equal(haystack.includes(forbidden), false, `${forbidden} absent`);
  }
});

test("Stage 4H.5 reproduce script routes every step through typed wrapper", () => {
  const script = readFileSync("scripts/reproduce-llm-shield-stage4h.sh", "utf8");
  assert.match(script, /exit_via_wrapper\(\)/);
  assert.match(script, /run_step\(\)/);
  assert.equal(/exit 1\b/.test(script), false);
  assert.match(script, /stage4CodeForRawCode/);
});

test("Stage 4H.5 reviewer T2-T6 smokes route through typed exits", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4h-reviewer-smoke-"));
  try {
    const cases = [
      { id: "T2", description: "premise digest flip", raw: 22, typed: 1 },
      { id: "T3", description: "signature corruption", raw: 25, typed: 1 },
      { id: "T4", description: "egress double", raw: 28, typed: 2 },
      { id: "T5", description: "proof deletion", rawAnyOf: [24, 26], typed: 1 },
      { id: "T6", description: "Q7 privacy budget violation", raw: 27, typed: 1 },
    ];
    for (const item of cases) {
      const result = await runReviewerSmoke(item.id, tmp);
      if (item.rawAnyOf) {
        assert.equal(item.rawAnyOf.includes(result.raw), true, `${item.id} raw ${result.raw}`);
      } else {
        assert.equal(result.raw, item.raw, item.description);
      }
      assert.equal(stage4CodeForRawCode(result.raw), item.typed, item.id);
      assert.equal(result.usedSharedVerifierPath, true, item.id);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

async function runReviewerSmoke(id, tmp) {
  if (id === "T2") {
    const out = join(tmp, "t2.json");
    const json = runVerifierToJson(
      [
        "--base-pack",
        `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.json`,
        "--base-pack-sig",
        `${fixtureRoot}/q4-dirty-one-edge-delta-base-pack.sig`,
        "--base-pack-pubkey",
        `${fixtureRoot}/q4-dirty-one-edge-delta-signer.pub`,
        "--certificate",
        `${fixtureRoot}/q4a-forged-premise-digest-certificate.json`,
        "--manifest",
        `${fixtureRoot}/q4a-forged-premise-digest-signed-pack-manifest.json`,
        "--manifest-pubkey",
        `${fixtureRoot}/manifest-verifier.pub`,
      ],
      out
    );
    return { raw: json.code, usedSharedVerifierPath: true };
  }
  if (id === "T3") {
    const out = join(tmp, "t3.json");
    const badSig = join(tmp, "bad-base-pack.sig");
    writeFileSync(badSig, "base64:ZmFrZQ==\n");
    const json = runVerifierToJson(
      [
        "--base-pack",
        `${fixtureRoot}/q1-clean-base-pack.json`,
        "--base-pack-sig",
        badSig,
        "--base-pack-pubkey",
        `${fixtureRoot}/q1-clean-signer.pub`,
        "--certificate",
        `${fixtureRoot}/q1-clean-dfi-certificate.json`,
        "--manifest",
        `${fixtureRoot}/q1-clean-signed-pack-manifest.json`,
        "--manifest-pubkey",
        `${fixtureRoot}/manifest-verifier.pub`,
      ],
      out
    );
    return { raw: json.code, usedSharedVerifierPath: true };
  }
  if (id === "T4") {
    const result = await runOffline(async () => {
      const { attemptEgress } =
        await import("../../../fixtures/llmShield/stage4h/offline/egress-double.mjs");
      return attemptEgress("fetch");
    });
    return { raw: result.code, usedSharedVerifierPath: true };
  }
  if (id === "T5") {
    const out = join(tmp, "t5.json");
    const deleted = buildProofDeletionClosureFixture({ outputDir: join(tmp, "t5") });
    const json = runVerifierToJson(
      [
        "--base-pack",
        deleted.basePackPath,
        "--base-pack-sig",
        deleted.basePackSigPath,
        "--base-pack-pubkey",
        deleted.basePackPubkeyPath,
        "--certificate",
        deleted.certificatePath,
        "--manifest",
        deleted.manifestPath,
        "--manifest-pubkey",
        deleted.manifestPubkeyPath,
      ],
      out
    );
    assert.notEqual(json.code, 25);
    return { raw: json.code, usedSharedVerifierPath: true };
  }
  if (id === "T6") {
    const cert = readJson(`${fixtureRoot}/privacy/q7-clean-certificate.json`);
    cert.derivation.derived_node_labels[0].label = "raw prompt text";
    const result = privacyGate(cert);
    return { raw: result.code, usedSharedVerifierPath: true };
  }
  throw new Error(`unknown reviewer smoke: ${id}`);
}

test("Stage 4H.1 verifier CLI rejects forged premise digest with raw code 22", () => {
  const out = `${fixtureRoot}/expected-results/forged-premise-cli-results.json`;
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/forged-premise-digest-certificate.json`,
          "--manifest",
          `${fixtureRoot}/forged-premise-digest-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          out,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 1 && readJson(out).code === 22
  );
});

test("Stage 4H.1 verifier CLI rejects malformed certificate schema with raw code 20 before Q2", () => {
  const out = `${fixtureRoot}/expected-results/malformed-cli-results.json`;
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/malformed-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          out,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 1 && readJson(out).code === 20
  );
});

test("Stage 4H.1 verifier CLI rejects invalid base-pack signature with raw code 25", () => {
  const out = `${fixtureRoot}/expected-results/wrong-base-pack-sig-results.json`;
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/q1-clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/wrong-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/q1-clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/q1-clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/q1-clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          out,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 1 && readJson(out).code === 25
  );
});
