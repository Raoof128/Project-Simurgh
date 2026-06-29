// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
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
