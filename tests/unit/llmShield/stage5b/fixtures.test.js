// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — byte-stable attestation fixture (plan Task 11). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildStage5bAttestation } from "../../../../tools/simurgh-attestation/stage5b/node/build-stage5b-fixtures.mjs";
import { verify } from "../../../../tools/simurgh-attestation/stage5b/node/verify-stage5b-attestation.mjs";
import { evaluateVar } from "../../../../tools/simurgh-attestation/stage5b/core/varCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const committed = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json"), "utf8")
);

test("the committed attestation verifies GREEN at both tiers over the real capture", () => {
  assert.equal(evaluateVar(committed, { tier: "public" }).raw, 0);
  assert.equal(verify({ tier: "public" }).raw, 0);
  assert.equal(verify({ tier: "audit" }).raw, 0);
});

test("the committed attestation is byte-identical to a fresh build (byte-stable)", () => {
  const fresh = canonicalJson(buildStage5bAttestation());
  const onDisk = readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json"),
    "utf8"
  );
  assert.equal(fresh, onDisk);
});

test("the attestation carries the 46-attack corpus grounded on the real 1B capture", () => {
  assert.equal(committed.findings.length, 46);
  assert.equal(committed.capture_binding.ceremony.model_id, "meta-llama/Llama-3.2-1B-Instruct");
  assert.equal(committed.attestation.aggregates.asr, "0/46");
});

test("tamper: swapping a capture tensor breaks No Author's Map (214)", () => {
  const b = structuredClone(committed);
  const k = Object.keys(b.frozen_capture.tensors_b64)[0];
  b.frozen_capture.tensors_b64[k] = Buffer.from([1, 2, 3]).toString("base64");
  assert.equal(evaluateVar(b, { tier: "public" }).raw, 214);
});

test("tamper: a hand-edited ASR is caught (222)", () => {
  const b = structuredClone(committed);
  b.attestation.aggregates.asr = "9/46";
  // signature no longer matches the mutated aggregates → 211 first (honest: the signed body
  // changed). Re-sign would be needed to reach 222; here the signature guard fires.
  assert.equal(evaluateVar(b, { tier: "public" }).raw, 211);
});
