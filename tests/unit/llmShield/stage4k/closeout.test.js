// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const EV = "docs/research/llm-shield/evidence/stage-4k";
const FIX = "tests/fixtures/llmShield/stage4k";
const read = (p) => readFileSync(p, "utf8");

test("evidence pack is complete", () => {
  for (const f of [
    "extraction-ledger.json",
    "budget-policy.json",
    "extraction-attestation.json",
    "eba-manifest.json",
    "extraction-summary.json",
    "README.md",
  ]) {
    assert.ok(existsSync(`${EV}/${f}`), f);
  }
});

test("evidence + committed ledgers are metadata-only (no plaintext ids, no content keys)", () => {
  const targets = [
    `${EV}/extraction-ledger.json`,
    `${EV}/extraction-attestation.json`,
    `${EV}/extraction-summary.json`,
    `${FIX}/bundles/under-budget/extraction-ledger.json`,
    `${FIX}/bundles/over-budget/extraction-attestation.json`,
  ];
  const forbidden = [
    "consumer_alpha",
    "consumer_beta",
    "consumer_gamma",
    "session_a",
    "session_b",
    "session_c",
    "session_d",
    "session_e",
    '"prompt"',
    '"output"',
    '"completion"',
    '"transcript"',
    '"tool_args"',
  ];
  for (const t of targets) {
    const s = read(t);
    for (const leak of forbidden) assert.equal(s.includes(leak), false, `${t} contains ${leak}`);
  }
});

test("overclaim guard: forbidden claims appear nowhere in stage4k code, fixtures, or scripts", () => {
  const files = [
    "tools/simurgh-attestation/stage4k/constants.mjs",
    "tools/simurgh-attestation/stage4k/extractionLedger.mjs",
    "tools/simurgh-attestation/stage4k/extractionBudgetGate.mjs",
    "tools/simurgh-attestation/stage4k/ebaManifest.mjs",
    "tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs",
    "tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs",
    "tools/simurgh-attestation/stage4k/emit-stage4k-evidence.mjs",
    "scripts/reproduce-llm-shield-stage4k.sh",
    `${EV}/extraction-summary.json`,
  ];
  const overclaim =
    /capability.transfer|distillation.proof|first .*(distillation|extraction)|prevents distillation|makes? models? safe|sybil.*(closed|solved)/i;
  for (const f of files) assert.equal(overclaim.test(read(f)), false, f);
});

test("closeout + checklist carry the required non-claims and reviewer tests", () => {
  const closeout = read("docs/research/llm-shield/STAGE_4K_CLOSEOUT.md");
  for (const nc of [
    "not_capability_transfer_proof",
    "not_sybil_collusion_closure",
    "budget_is_declared_policy_not_safety_bound",
    "weights_are_declared_policy",
    "substrate_is_synthetic_fixture_stream",
    "consumer_digest_is_pseudonymous_not_anonymous",
    "attestation_assumes_reviewer_runtime",
    "ledger_is_metadata_only",
  ]) {
    assert.ok(closeout.includes(nc), nc);
  }
  const checklist = read("docs/research/llm-shield/STAGE_4K_REVIEWER_CHECKLIST.md");
  for (const t of ["T1", "T2", "T3", "T4", "T5", "T6"]) assert.ok(checklist.includes(t), t);
  assert.ok(closeout.includes("39"), "reserved raw 39 must be named in closeout");
});

test("summary conjunction is verbatim and complete", () => {
  const summary = JSON.parse(read(`${EV}/extraction-summary.json`));
  assert.equal(summary.stage, "4K");
  assert.equal(summary.gate, "Q8");
  assert.deepEqual(Object.keys(summary.results).sort(), ["over-budget", "under-budget"]);
  assert.equal(summary.conjunction.q8_status, "pass");
});
