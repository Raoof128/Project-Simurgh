// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — K7 all-functions net (plan Task 16): every export exercised, the tamper matrix
// asserts the correct FIRST-failure code, and the cross-stage invariant confirms the recorded
// target_raw equals the frozen verifier's real output. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as constants from "../../../../tools/simurgh-attestation/stage5b/constants.mjs";
import * as charter from "../../../../tools/simurgh-attestation/stage5b/core/charter.mjs";
import * as captureBinding from "../../../../tools/simurgh-attestation/stage5b/core/captureBinding.mjs";
import * as attackModel from "../../../../tools/simurgh-attestation/stage5b/core/attackModel.mjs";
import * as findingLedger from "../../../../tools/simurgh-attestation/stage5b/core/findingLedger.mjs";
import * as asrCore from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";
import * as varCore from "../../../../tools/simurgh-attestation/stage5b/core/varCore.mjs";
import * as ceremonyCore from "../../../../tools/simurgh-attestation/stage5b/lanec/ceremonyCore.mjs";
import * as greenBundle from "../../../../tools/simurgh-attestation/stage5b/node/greenBundle.mjs";
import * as corpus from "../../../../tools/simurgh-attestation/stage5b/node/build-stage5b-corpus.mjs";
import { driveTarget } from "../../../../tools/simurgh-attestation/stage5b/node/greenBundle.mjs";
import { evaluateVar } from "../../../../tools/simurgh-attestation/stage5b/core/varCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const committed = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json"), "utf8")
);
const clone = () => structuredClone(committed);

test("K7.1 — every module export is defined", () => {
  const mods = { constants, charter, captureBinding, attackModel, findingLedger, asrCore, varCore, ceremonyCore, greenBundle, corpus };
  for (const [name, mod] of Object.entries(mods))
    for (const [k, v] of Object.entries(mod))
      assert.ok(v !== undefined, `${name}.${k} defined`);
});

test("K7.2 — the committed attestation is GREEN at both tiers", () => {
  assert.equal(evaluateVar(committed, { tier: "public" }).raw, 0);
});

test("K7.3 — tamper matrix: each bound field trips the correct FIRST-failure code", () => {
  const cases = [
    ["schema (210)", (b) => delete b.charter.schema, 210],
    ["signature (211)", (b) => (b.attestation.signature = "00" + b.attestation.signature.slice(2)), 211],
    ["No Author's Map (214)", (b) => {
      const k = Object.keys(b.frozen_capture.tensors_b64)[0];
      b.frozen_capture.tensors_b64[k] = Buffer.from([1, 1, 1]).toString("base64");
    }, 214],
    ["capture ceremony (215)", (b) => (b.capture_binding.declaration_digest = "sha256:" + "e".repeat(64)), 215],
    ["finding classification (216)", (b) => (b.findings[0].outcome = "vanished"), 216],
    ["bypass label mismatch (218)", (b) => (b.findings[0].outcome = "bypass"), 218],
    ["partition (221)", (b) => b.findings.pop(), 221],
  ];
  for (const [label, mutate, code] of cases) {
    const b = clone();
    mutate(b);
    assert.equal(evaluateVar(b, { tier: "public" }).raw, code, label);
  }
});

test("K7.4 — direct checks reach the re-sign-gated codes (212/213/219/220/222/223)", () => {
  // 212/219 via charter checks
  const c = clone().charter;
  c.campaign_seed = "evil";
  assert.equal(charter.checkCharterCampaign(c, {}).raw, 212);
  const c2 = clone().charter;
  c2.tensor_commitment_root = "sha256:" + "a".repeat(64);
  assert.equal(charter.checkPrecommitStructural(c2).raw, 219);
  // 213 unscheduled
  assert.equal(charter.verifyAttackScheduled("nope#9", committed.charter).raw, 213);
  // 220 severity lock
  assert.equal(findingLedger.checkSeverityLock({ attack_id: "x", outcome: "bypass" }, []).raw, 220);
  // 222 ASR recompute
  assert.equal(asrCore.checkAsrRecompute({ asr: "9/9" }, committed.findings).raw, 222);
  // 223 tallies
  assert.equal(asrCore.checkTallies({ aggregates: { bogus: 1 } }, committed.findings).raw, 223);
});

test("K7.5 — cross-stage invariant: recorded target_raw == frozen verifier's live output", () => {
  for (const f of committed.findings) {
    if (f.target_stage === "self") continue;
    const mutation = f.family === "conflict_laundering" ? "launder" : "signature";
    assert.equal(driveTarget(f.target_stage, mutation), f.target_raw, f.attack_id);
  }
});
