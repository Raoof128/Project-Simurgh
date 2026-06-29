// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import {
  campaignIdFromConfig,
  campaignMerkleRoot,
  signCampaignPayload,
} from "../../../../tools/simurgh-attestation/stage4g/campaignCrypto.mjs";
import {
  buildCampaignRecord,
  signRecordEnvelope,
} from "../../../../tools/simurgh-attestation/stage4g/records.mjs";
import {
  deriveCanonicalSeed,
  deriveSchedule,
} from "../../../../tools/simurgh-attestation/stage4g/schedule.mjs";
import { verifyCampaign } from "../../../../tools/simurgh-attestation/stage4g/verifyCampaign.mjs";

function fixtureCampaign() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const config = {
    target_commit: "0123456789abcdef0123456789abcdef01234567",
    library_hash: "sha256:" + "a".repeat(64),
    policy_hash: "sha256:" + "b".repeat(64),
    driver_hash: "sha256:" + "c".repeat(64),
    budget: { queries_total: 2, per_class: { I: 0, II: 0, III: 1, IV: 1 } },
  };
  const seed = deriveCanonicalSeed(config);
  const schedule = deriveSchedule({ ...config, seed });
  const records = schedule.map((slot) => {
    const record = buildCampaignRecord({
      attempt_id: slot.id,
      target_class: slot.target_class,
      resolved_class: slot.target_class,
      verdict: slot.target_class === "III" ? "out_of_scope" : "escaped",
      reason_codes:
        slot.target_class === "III" ? ["unmediated_action"] : ["boundary_escape_recorded"],
      sealed_inputs_hash: slot.schedule_hash,
    });
    return signRecordEnvelope(record, privateKey);
  });
  const attempts = records.map((envelope) => ({
    id: envelope.payload.attempt_id,
    target_class: envelope.payload.target_class,
    resolved_class: envelope.payload.resolved_class,
    verdict: envelope.payload.verdict,
    record_type: envelope.payload.record_type,
    record_ref: `stage4g://records/${envelope.payload.attempt_id}`,
    record_hash: envelope.record_hash,
    reason_codes: envelope.payload.reason_codes,
  }));
  const campaign_id = campaignIdFromConfig({ ...config, seed });
  const campaign_merkle_root = campaignMerkleRoot(
    attempts.map((attempt) => attempt.record_hash)
  );
  const manifest = {
    manifest_version: "simurgh.stage4g.campaign.v1",
    campaign_id,
    seed,
    budget: config.budget,
    library_hash: config.library_hash,
    target_commit: config.target_commit,
    policy_hash: config.policy_hash,
    driver_hash: config.driver_hash,
    campaign_merkle_root,
    attempt_count: attempts.length,
    attempts,
    counts: { resolved: 2, caught: 0, escaped: 1, out_of_scope: 1, aborted: 0 },
    golden_digest: campaignIdFromConfig({ ...config, seed, driver_hash: campaign_merkle_root }),
  };
  const signedManifest = { payload: manifest, signature: signCampaignPayload(manifest, privateKey) };
  return { signedManifest, records, publicKey, privateKey };
}

test("verifyCampaign accepts a complete canonical campaign", () => {
  const campaign = fixtureCampaign();
  const result = verifyCampaign(campaign);
  assert.equal(result.ok, true);
  assert.equal(result.campaign_verified, true);
  assert.equal(result.security_escapes, 1);
});

test("verifyCampaign rejects missing scheduled attempts", () => {
  const campaign = fixtureCampaign();
  campaign.records.pop();
  const result = verifyCampaign(campaign);
  assert.equal(result.ok, false);
  assert.equal(result.first_failure.reason, "missing_attempt");
});

test("verifyCampaign rejects manifest shrinking, class relabeling, and privacy leaks", () => {
  const shrunk = fixtureCampaign();
  shrunk.signedManifest.payload.attempts.pop();
  shrunk.signedManifest.payload.attempt_count = 1;
  shrunk.signedManifest.payload.campaign_merkle_root = campaignMerkleRoot(
    shrunk.signedManifest.payload.attempts.map((attempt) => attempt.record_hash)
  );
  shrunk.signedManifest.payload.counts = {
    resolved: 1,
    caught: 0,
    escaped: 0,
    out_of_scope: 1,
    aborted: 0,
  };
  shrunk.signedManifest.signature = signCampaignPayload(
    shrunk.signedManifest.payload,
    shrunk.privateKey
  );
  const shrinkResult = verifyCampaign(shrunk);
  assert.equal(shrinkResult.ok, false);
  assert.equal(shrinkResult.first_failure.reason, "attempt_schedule_mismatch");

  const campaign = fixtureCampaign();
  campaign.signedManifest.payload.attempts[0].resolved_class = "I";
  campaign.signedManifest.signature = signCampaignPayload(
    campaign.signedManifest.payload,
    campaign.privateKey
  );
  const classResult = verifyCampaign(campaign);
  assert.equal(classResult.ok, false);
  assert.equal(classResult.first_failure.reason, "class_mismatch");

  const leakCampaign = fixtureCampaign();
  leakCampaign.records[0].payload.raw_prompt = "sk-proj-secret";
  const leakResult = verifyCampaign(leakCampaign);
  assert.equal(leakResult.ok, false);
  assert.equal(leakResult.first_failure.reason, "privacy_leak_detected");
});
