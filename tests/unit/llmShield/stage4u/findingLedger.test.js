// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U finding ledger tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  buildFinding,
  validateFindingRecord,
  verifyLedger,
  verifyBypassSeverity,
  recomputeAsr,
  laneBStats,
  signFinding,
  verifyFindingSignature,
} from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";
import { deriveAttackIds } from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import {
  CAMPAIGN_SEED,
  FAMILY_COUNTS,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
const charter = {
  campaign_seed: CAMPAIGN_SEED,
  attack_family_counts: FAMILY_COUNTS,
  declared_attack_count: ids.length,
};
const fixtures = ids.map((id) => ({ attack_id: id, family: id.split(":")[1].split("#")[0] }));
const survivedFindings = ids.map((id) =>
  buildFinding({
    attack_id: id,
    family: id.split(":")[1].split("#")[0],
    self_reported_raw: 111,
    verifier_recomputed_raw: 111,
    expected_raw: 111,
    outcome_class: "survived",
    severity: null,
  })
);

test("complete survived ledger is GREEN", () => {
  assert.deepEqual(verifyLedger(charter, fixtures, survivedFindings), { raw: 0, reason: "green" });
});
test("dropping a finding -> 125", () => {
  assert.equal(verifyLedger(charter, fixtures, survivedFindings.slice(1)).raw, 125);
});
test("count mismatch (extra fixture, no id) -> 126", () => {
  const extra = [
    ...fixtures,
    { attack_id: "stage4u-vrta-seed-v1:ghost_hop#99", family: "ghost_hop" },
  ];
  assert.equal(verifyLedger(charter, extra, survivedFindings).raw, 126);
});
test("bypass without severity -> 131", () => {
  const f = [...survivedFindings];
  f[0] = buildFinding({
    attack_id: ids[0],
    family: "ghost_hop",
    self_reported_raw: 0,
    verifier_recomputed_raw: 0,
    expected_raw: 111,
    outcome_class: "bypass",
    severity: null,
  });
  assert.equal(verifyBypassSeverity(f).raw, 131);
  assert.deepEqual(verifyLedger(charter, fixtures, f), { raw: 0, reason: "green" });
});
test("invalid outcome_class -> 119 (schema, not 125)", () => {
  const f = { ...survivedFindings[0], outcome_class: "totally_fine" };
  assert.equal(validateFindingRecord(f).raw, 119);
});
test("recomputeAsr is an EXACT rational (no float)", () => {
  const r = recomputeAsr(survivedFindings);
  assert.deepEqual(r.attack_success_rate, {
    confirmed_bypass: 0,
    executed_non_refusal: 58,
    ratio: "0/58",
  });
});
test("laneBStats reports refusals separately from corpus ASR", () => {
  const capture = [
    buildFinding({
      attack_id: "x",
      family: "fable_adaptive",
      self_reported_raw: null,
      verifier_recomputed_raw: null,
      expected_raw: 111,
      outcome_class: "model_refused",
      severity: null,
    }),
    buildFinding({
      attack_id: "y",
      family: "fable_adaptive",
      self_reported_raw: 111,
      verifier_recomputed_raw: 111,
      expected_raw: 111,
      outcome_class: "survived",
      severity: null,
    }),
  ];
  const s = laneBStats(capture);
  assert.equal(s.model_refused, 1);
  assert.deepEqual(s.over_refusal_rate, { refused: 1, attempts: 2, ratio: "1/2" });
});
test("signFinding round-trips; wrong finding_key_digest -> 120 (key binding)", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const pub = crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
  const signed = signFinding(survivedFindings[0], privateKey);
  assert.deepEqual(verifyFindingSignature(signed, pub), { raw: 0, reason: "green" });
  const wrongDigest = { ...signed, finding_key_digest: "sha256:" + "0".repeat(64) };
  const r = verifyFindingSignature(wrongDigest, pub);
  assert.equal(r.raw, 120);
  assert.ok(r.detail.key_digest_mismatch);
});
