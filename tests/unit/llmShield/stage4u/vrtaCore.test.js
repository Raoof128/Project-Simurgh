// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U vrtaCore tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import {
  evaluateVrta,
  evaluateVrtaSafe,
} from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";
import {
  buildCharter,
  signCharter,
  charterDigest,
  deriveAttackIds,
} from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import {
  buildFinding,
  signFinding,
  recomputeAsr,
} from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import {
  CAMPAIGN_SEED,
  FAMILY_COUNTS,
  SCHEMAS,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const priv = crypto.createPrivateKey(
  readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta-charter.pem")
);
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const caps = { max_turns: 6, max_tokens: 4000, max_spend_usd: 2 };

function greenBundle() {
  const charter = signCharter(
    buildCharter({
      seed: CAMPAIGN_SEED,
      familyCounts: FAMILY_COUNTS,
      caps,
      charterKeyDigest: keyDigest(pubPem),
    }),
    priv
  );
  const cd = charterDigest(charter);
  const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
  const attack_fixtures = ids.map((id) => ({
    schema: SCHEMAS.ATTACK_FIXTURE,
    attack_id: id,
    family: id.split(":")[1].split("#")[0],
    charter_digest: cd,
    target: "vdcc_verifier",
    payload: { kind: "chain_bundle", bundle: {} },
    expected_raw: 111,
    key_refs: ["INSECURE_FIXTURE_ONLY_delegator"],
    endpoint: "in_repo",
  }));
  const finding_records = ids.map((id) =>
    signFinding(
      buildFinding({
        attack_id: id,
        family: id.split(":")[1].split("#")[0],
        self_reported_raw: 111,
        verifier_recomputed_raw: 111,
        expected_raw: 111,
        outcome_class: "survived",
        severity: null,
      }),
      priv
    )
  );
  const asr = recomputeAsr(finding_records).attack_success_rate;
  return { charter, attack_fixtures, finding_records, lane_b_capture: [], asr };
}
const opts = { pubKeyPem: pubPem, findingPubKeyPem: pubPem };

test("well-formed bundle is GREEN (public tier — also runs 127/128)", () => {
  assert.deepEqual(evaluateVrta(greenBundle(), opts), { raw: 0, reason: "green" });
});
test("fixture not bound to charter -> 121", () => {
  const b = greenBundle();
  b.attack_fixtures[0].charter_digest = "sha256:" + "f".repeat(64);
  assert.equal(evaluateVrta(b, opts).raw, 121);
});
test("non-fixture key -> 122", () => {
  const b = greenBundle();
  b.attack_fixtures[0].key_refs = ["prod_key"];
  assert.equal(evaluateVrta(b, opts).raw, 122);
});
test("cap breach -> 123", () => {
  assert.equal(evaluateVrta(greenBundle(), { ...opts, capBreaches: ["max_tokens"] }).raw, 123);
});
test("tampered finding signature -> 120", () => {
  const b = greenBundle();
  b.finding_records[0].signature = b.finding_records[0].signature.replace(/^../, "00");
  assert.equal(evaluateVrta(b, opts).raw, 120);
});
test("public tier catches 127 without an engine", () => {
  const b = greenBundle();
  b.finding_records[0] = signFinding(
    buildFinding({
      attack_id: b.finding_records[0].attack_id,
      family: "ghost_hop",
      self_reported_raw: 0,
      verifier_recomputed_raw: 111,
      expected_raw: 111,
      outcome_class: "survived",
      severity: null,
    }),
    priv
  );
  assert.equal(evaluateVrta(b, opts).raw, 127);
});
test("audit tier: engine disagreeing with recorded recompute -> 129", () => {
  assert.equal(evaluateVrta(greenBundle(), { ...opts, engine: () => 105 }).raw, 129);
});
test("evaluateVrtaSafe returns 132 on a thrown engine", () => {
  assert.equal(
    evaluateVrtaSafe(greenBundle(), {
      ...opts,
      engine: () => {
        throw new Error("boom");
      },
    }).raw,
    132
  );
});
test("ASR ledger mismatch -> 130 (exact rational)", () => {
  const b = greenBundle();
  b.asr = { confirmed_bypass: 1, executed_non_refusal: 58, ratio: "1/58" };
  assert.equal(evaluateVrta(b, opts).raw, 130);
});
test("missing lane_b_capture array -> 119 (schema)", () => {
  const b = greenBundle();
  delete b.lane_b_capture;
  assert.equal(evaluateVrta(b, opts).raw, 119);
});
