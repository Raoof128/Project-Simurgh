// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
    `${fixtureRoot}/expected-results/discrimination-results.json`,
    `${evidenceRoot}/certificate.json`,
    `${evidenceRoot}/signed-pack-manifest.json`,
    `${evidenceRoot}/verifier-results.json`,
    `${evidenceRoot}/q-gate-results.json`,
    `${evidenceRoot}/e2e-smoke-coverage.json`,
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
  assert.equal(qGate.gates.Q3.status, "not_in_scope");
  assert.equal(qGate.gates.Q6.status, "not_in_scope");
  assert.equal(qGate.gates.Q7.status, "not_in_scope");
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
  assert.match(output, /Stage 4H\.2 Q0\/Q1\/Q2\/Q4\/Q5 verifier discrimination: PASS/);
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
    "Q3 pass",
    "Q6 pass",
    "Q7 pass",
    "first proof",
    "public priority",
    "jailbreak-proof",
    "jailbreak resistance",
    "model-safe",
    "execution truth",
    "future-run guarantee",
    "full non-interference",
    "implicit-flow proof",
  ]) {
    assert.equal(haystack.includes(forbidden), false, `${forbidden} absent`);
  }
});

test("Stage 4H.1 verifier CLI rejects forged premise digest with code 22", () => {
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
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/forged-premise-cli-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 22
  );
});

test("Stage 4H.1 verifier CLI rejects malformed certificate schema with code 20 before Q2", () => {
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
          `${fixtureRoot}/expected-results/malformed-cli-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 20
  );
});

test("Stage 4H.1 verifier CLI rejects invalid base-pack signature with code 25", () => {
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
          `${fixtureRoot}/expected-results/wrong-base-pack-sig-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});
