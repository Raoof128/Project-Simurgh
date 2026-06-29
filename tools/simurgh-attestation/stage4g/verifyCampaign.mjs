// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  campaignIdFromConfig,
  campaignMerkleRoot,
  verifyCampaignSignature,
} from "./campaignCrypto.mjs";
import { recomputeRecordOutcome } from "./classifier.mjs";
import { LIMITS } from "./constants.mjs";
import { recordHash, verifyRecordEnvelope } from "./records.mjs";
import { deriveSchedule } from "./schedule.mjs";
import { validateCampaignManifest } from "./schemas.mjs";

function fail(reason, detail = {}) {
  return { ok: false, campaign_verified: false, first_failure: { reason, ...detail } };
}

function containsPrivacyLeak(value) {
  const text = JSON.stringify(value);
  return /sk-proj-|BEGIN PRIVATE KEY|raw_prompt|raw_model_output|provider_transcript|\/tmp\/simurgh/i.test(
    text
  );
}

export function verifyCampaign({ signedManifest, records, publicKey }) {
  const encoded =
    Buffer.byteLength(JSON.stringify(signedManifest), "utf8") +
    Buffer.byteLength(JSON.stringify(records), "utf8");
  if (encoded > LIMITS.maxCampaignBytes) return fail("oversized_campaign");
  if (containsPrivacyLeak(signedManifest) || containsPrivacyLeak(records)) {
    return fail("privacy_leak_detected");
  }

  const manifest = signedManifest?.payload;
  const schema = validateCampaignManifest(manifest);
  if (!schema.ok) return fail("stage_result_schema_missing", schema);
  if (!verifyCampaignSignature(manifest, signedManifest.signature, publicKey)) {
    return fail("campaign_signature_invalid");
  }

  const expectedCampaignId = campaignIdFromConfig({
    seed: manifest.seed,
    budget: manifest.budget,
    library_hash: manifest.library_hash,
    target_commit: manifest.target_commit,
    policy_hash: manifest.policy_hash,
    driver_hash: manifest.driver_hash,
  });
  if (manifest.campaign_id !== expectedCampaignId) return fail("campaign_hash_mismatch");

  const expectedMerkleRoot = campaignMerkleRoot(
    manifest.attempts.map((attempt) => attempt.record_hash)
  );
  if (manifest.campaign_merkle_root !== expectedMerkleRoot) {
    return fail("campaign_merkle_root_mismatch");
  }

  let expectedSchedule;
  try {
    expectedSchedule = deriveSchedule({
      seed: manifest.seed,
      budget: manifest.budget,
      library_hash: manifest.library_hash,
      target_commit: manifest.target_commit,
      policy_hash: manifest.policy_hash,
      driver_hash: manifest.driver_hash,
    });
  } catch (error) {
    return fail("attempt_schedule_mismatch", { message: error.message });
  }
  const expectedIds = expectedSchedule.map((slot) => slot.id);
  const manifestIds = manifest.attempts.map((attempt) => attempt.id);
  if (JSON.stringify(expectedIds) !== JSON.stringify(manifestIds)) {
    return fail("attempt_schedule_mismatch", { expected: expectedIds, observed: manifestIds });
  }

  const byAttempt = new Map();
  for (const envelope of records) {
    const recordBytes = Buffer.byteLength(JSON.stringify(envelope), "utf8");
    if (recordBytes > LIMITS.maxRecordBytes) {
      return fail("oversized_campaign", { attempt_id: envelope?.payload?.attempt_id });
    }
    if (containsPrivacyLeak(envelope)) {
      return fail("privacy_leak_detected", { attempt_id: envelope?.payload?.attempt_id });
    }
    const verified = verifyRecordEnvelope(envelope, publicKey);
    if (!verified.ok) return fail(verified.reason, { attempt_id: envelope?.payload?.attempt_id });
    const attemptId = envelope.payload.attempt_id;
    if (byAttempt.has(attemptId)) return fail("duplicate_attempt", { attempt_id: attemptId });
    byAttempt.set(attemptId, envelope);
  }

  let securityEscapes = 0;
  const recomputedCounts = { resolved: 0, caught: 0, escaped: 0, out_of_scope: 0, aborted: 0 };
  for (const attempt of manifest.attempts) {
    const envelope = byAttempt.get(attempt.id);
    if (!envelope) return fail("missing_attempt", { attempt_id: attempt.id });
    if (attempt.record_hash !== recordHash(envelope.payload)) {
      return fail("record_hash_mismatch", { attempt_id: attempt.id });
    }
    const recomputed = recomputeRecordOutcome(envelope.payload);
    if (attempt.resolved_class !== recomputed.resolved_class) {
      return fail("class_mismatch", { attempt_id: attempt.id });
    }
    if (attempt.verdict !== recomputed.verdict) {
      return fail("verdict_mismatch", { attempt_id: attempt.id });
    }
    if (attempt.target_class === "II" && attempt.verdict === "caught") {
      recomputedCounts.resolved += 1;
      recomputedCounts.caught += 1;
      continue;
    }
    if (attempt.target_class === "II" && attempt.verdict !== "caught") {
      return fail("class_ii_verifier_deception_passed", { attempt_id: attempt.id });
    }
    if (attempt.verdict === "escaped") securityEscapes += 1;
    recomputedCounts.resolved += 1;
    if (attempt.verdict === "caught") recomputedCounts.caught += 1;
    if (attempt.verdict === "escaped") recomputedCounts.escaped += 1;
    if (attempt.verdict === "out_of_scope") recomputedCounts.out_of_scope += 1;
    if (attempt.verdict === "aborted") recomputedCounts.aborted += 1;
  }

  for (const attemptId of byAttempt.keys()) {
    if (!manifest.attempts.some((attempt) => attempt.id === attemptId)) {
      return fail("extra_attempt", { attempt_id: attemptId });
    }
  }

  if (JSON.stringify(manifest.counts) !== JSON.stringify(recomputedCounts)) {
    return fail("verdict_mismatch", { field: "counts" });
  }

  return { ok: true, campaign_verified: true, security_escapes: securityEscapes, first_failure: null };
}
