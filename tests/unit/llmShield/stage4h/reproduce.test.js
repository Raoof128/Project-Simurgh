// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const fixtureRoot = "tests/fixtures/llmShield/stage4h";
const evidenceRoot = "docs/research/llm-shield/evidence/stage-4h";

test("Stage 4H.0 committed fixtures and evidence are present and non-claiming", () => {
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
    `${evidenceRoot}/certificate.json`,
    `${evidenceRoot}/signed-pack-manifest.json`,
    `${evidenceRoot}/verifier-results.json`,
    `${evidenceRoot}/q-gate-results.json`,
    `${evidenceRoot}/README.md`,
  ]) {
    assert.equal(existsSync(path), true, `${path} exists`);
  }
  const qGate = JSON.parse(readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"));
  assert.equal(qGate.gates.Q2.status, "pass");
  assert.equal(qGate.gates.Q5.status, "pass");
  assert.equal(qGate.gates.Q1.status, "not_in_scope");
  assert.equal(qGate.gates.Q3.status, "not_in_scope");
  assert.equal(qGate.gates.Q4.status, "not_in_scope");
  assert.equal(qGate.gates.Q6.status, "not_in_scope");
  assert.equal(qGate.gates.Q7.status, "not_in_scope");
});

test("Stage 4H.0 committed fixtures and evidence are metadata-only", () => {
  const haystack = [
    readFileSync(`${fixtureRoot}/clean-base-pack.json`, "utf8"),
    readFileSync(`${fixtureRoot}/clean-dfi-certificate.json`, "utf8"),
    readFileSync(`${fixtureRoot}/forged-premise-digest-certificate.json`, "utf8"),
    readFileSync(`${evidenceRoot}/verifier-results.json`, "utf8"),
    readFileSync(`${evidenceRoot}/q-gate-results.json`, "utf8"),
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

test("Stage 4H.0 verifier CLI accepts committed Q2/Q5 fixtures", () => {
  const output = execFileSync(
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
      `${fixtureRoot}/clean-dfi-certificate.json`,
      "--manifest",
      `${fixtureRoot}/clean-signed-pack-manifest.json`,
      "--manifest-pubkey",
      `${fixtureRoot}/manifest-verifier.pub`,
      "--out",
      `${fixtureRoot}/expected-results/cli-smoke-results.json`,
    ],
    { encoding: "utf8" }
  );
  assert.match(output, /Stage 4H.0 digest binding: PASS/);
});

test("Stage 4H.0 verifier CLI rejects forged premise digest with code 22", () => {
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

test("Stage 4H.0 verifier CLI rejects malformed certificate schema with code 20 before Q2", () => {
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

test("Stage 4H.0 verifier CLI rejects invalid base-pack signature with code 25", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/clean-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/wrong-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
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

test("Stage 4H.0 verifier CLI rejects wrong base-pack public key with code 25", () => {
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
          `${fixtureRoot}/wrong-base-pack.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/wrong-base-pack-pubkey-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});

test("Stage 4H.0 verifier CLI rejects tampered base pack with code 25", () => {
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "tools/simurgh-attestation/stage4h/verify-stage4h-digest-binding.mjs",
          "--base-pack",
          `${fixtureRoot}/tampered-base-pack.json`,
          "--base-pack-sig",
          `${fixtureRoot}/clean-base-pack.sig`,
          "--base-pack-pubkey",
          `${fixtureRoot}/clean-signer.pub`,
          "--certificate",
          `${fixtureRoot}/clean-dfi-certificate.json`,
          "--manifest",
          `${fixtureRoot}/clean-signed-pack-manifest.json`,
          "--manifest-pubkey",
          `${fixtureRoot}/manifest-verifier.pub`,
          "--out",
          `${fixtureRoot}/expected-results/tampered-base-pack-results.json`,
        ],
        { encoding: "utf8" }
      ),
    (error) => error.status === 25
  );
});
