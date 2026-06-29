// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import {
  CAMPAIGN_DOMAIN,
  CAMPAIGN_RECORD_DOMAIN,
  FAILURE_REASONS,
  STAGE4G_EVIDENCE_DIR,
} from "../../../../tools/simurgh-attestation/stage4g/constants.mjs";
import {
  campaignHash,
  campaignIdFromConfig,
  campaignMerkleRoot,
  signCampaignPayload,
  verifyCampaignSignature,
} from "../../../../tools/simurgh-attestation/stage4g/campaignCrypto.mjs";
import {
  validateCampaignManifest,
  validateCampaignRecord,
} from "../../../../tools/simurgh-attestation/stage4g/schemas.mjs";

test("Stage 4G constants pin domains, evidence root, and failure reasons", () => {
  assert.equal(CAMPAIGN_DOMAIN, "SIMURGH_CAMPAIGN_V1\0");
  assert.equal(CAMPAIGN_RECORD_DOMAIN, "SIMURGH_CAMPAIGN_RECORD_V1\0");
  assert.equal(
    STAGE4G_EVIDENCE_DIR,
    "docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign"
  );
  assert.ok(FAILURE_REASONS.includes("missing_attempt"));
  assert.ok(FAILURE_REASONS.includes("class_ii_verifier_deception_passed"));
  assert.ok(FAILURE_REASONS.includes("privacy_leak_detected"));
});

test("campaign signatures are domain separated and tamper evident", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const payload = {
    manifest_version: "simurgh.stage4g.campaign.v1",
    campaign_id: "sha256:abc",
  };
  const signature = signCampaignPayload(payload, privateKey);
  assert.equal(verifyCampaignSignature(payload, signature, publicKey), true);
  assert.equal(
    verifyCampaignSignature({ ...payload, campaign_id: "sha256:def" }, signature, publicKey),
    false
  );
  assert.match(campaignHash(payload), /^sha256:[a-f0-9]{64}$/);
  assert.match(
    campaignIdFromConfig({
      seed: "sha256:" + "1".repeat(64),
      budget: { queries_total: 1, per_class: { I: 1, II: 0, III: 0, IV: 0 } },
      library_hash: "sha256:" + "2".repeat(64),
      target_commit: "0123456789abcdef0123456789abcdef01234567",
      policy_hash: "sha256:" + "3".repeat(64),
      driver_hash: "sha256:" + "4".repeat(64),
    }),
    /^sha256:[a-f0-9]{64}$/
  );
  assert.match(
    campaignMerkleRoot(["sha256:" + "a".repeat(64), "sha256:" + "b".repeat(64)]),
    /^sha256:[a-f0-9]{64}$/
  );
});

test("schema validators accept minimal valid objects and reject ambiguous ones", () => {
  const manifest = {
    manifest_version: "simurgh.stage4g.campaign.v1",
    campaign_id: "sha256:" + "a".repeat(64),
    seed: "sha256:" + "b".repeat(64),
    budget: { queries_total: 4, per_class: { I: 1, II: 1, III: 1, IV: 1 } },
    library_hash: "sha256:" + "c".repeat(64),
    target_commit: "0123456789abcdef0123456789abcdef01234567",
    policy_hash: "sha256:" + "d".repeat(64),
    driver_hash: "sha256:" + "e".repeat(64),
    campaign_merkle_root: "sha256:" + "9".repeat(64),
    attempt_count: 1,
    attempts: [
      {
        id: "a0001",
        target_class: "I",
        resolved_class: "I",
        verdict: "caught",
        record_type: "EP",
        record_ref: "stage4g://records/a0001",
        record_hash: "sha256:" + "f".repeat(64),
        reason_codes: [],
      },
    ],
    counts: { resolved: 1, caught: 1, escaped: 0, out_of_scope: 0, aborted: 0 },
    golden_digest: "sha256:" + "1".repeat(64),
  };
  assert.equal(validateCampaignManifest(manifest).ok, true);
  assert.equal(validateCampaignManifest({ ...manifest, attempt_count: -1 }).ok, false);
  assert.equal(
    validateCampaignManifest({
      ...manifest,
      attempts: [{ ...manifest.attempts[0], target_class: "V" }],
    }).ok,
    false
  );

  const record = {
    record_version: "simurgh.stage4g.record.v1",
    attempt_id: "a0001",
    target_class: "III",
    resolved_class: "III",
    verdict: "out_of_scope",
    record_type: "CR",
    reason_codes: ["unmediated_action"],
    sealed_inputs_hash: "sha256:" + "2".repeat(64),
  };
  assert.equal(validateCampaignRecord(record).ok, true);
  assert.equal(validateCampaignRecord({ ...record, verdict: "safe" }).ok, false);
});
