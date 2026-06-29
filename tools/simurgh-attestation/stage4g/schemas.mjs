// SPDX-License-Identifier: AGPL-3.0-or-later
import { ATTACK_CLASSES, RECORD_TYPES, VERDICTS } from "./constants.mjs";

const HEX = /^sha256:[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ATTEMPT = /^a[0-9]{4}$/;

function fail(reason, path) {
  return { ok: false, reason, path };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateAttempt(attempt, index) {
  if (!isObject(attempt)) return fail("attempt_not_object", `attempts.${index}`);
  if (!ATTEMPT.test(attempt.id)) return fail("attempt_id_invalid", `attempts.${index}.id`);
  if (!ATTACK_CLASSES.includes(attempt.target_class)) {
    return fail("target_class_invalid", `attempts.${index}.target_class`);
  }
  if (!ATTACK_CLASSES.includes(attempt.resolved_class)) {
    return fail("resolved_class_invalid", `attempts.${index}.resolved_class`);
  }
  if (!VERDICTS.includes(attempt.verdict)) {
    return fail("verdict_invalid", `attempts.${index}.verdict`);
  }
  if (!RECORD_TYPES.includes(attempt.record_type)) {
    return fail("record_type_invalid", `attempts.${index}.record_type`);
  }
  if (typeof attempt.record_ref !== "string" || attempt.record_ref.length === 0) {
    return fail("record_ref_invalid", `attempts.${index}.record_ref`);
  }
  if (!HEX.test(attempt.record_hash)) {
    return fail("record_hash_invalid", `attempts.${index}.record_hash`);
  }
  if (!Array.isArray(attempt.reason_codes)) {
    return fail("reason_codes_invalid", `attempts.${index}.reason_codes`);
  }
  return { ok: true };
}

export function validateCampaignManifest(manifest) {
  if (!isObject(manifest)) return fail("manifest_not_object", "$");
  if (manifest.manifest_version !== "simurgh.stage4g.campaign.v1") {
    return fail("version_invalid", "manifest_version");
  }
  for (const field of [
    "campaign_id",
    "seed",
    "library_hash",
    "policy_hash",
    "driver_hash",
    "campaign_merkle_root",
    "golden_digest",
  ]) {
    if (!HEX.test(manifest[field])) return fail("digest_invalid", field);
  }
  if (!COMMIT.test(manifest.target_commit)) return fail("target_commit_invalid", "target_commit");
  if (
    !isObject(manifest.budget) ||
    !Number.isInteger(manifest.budget.queries_total) ||
    manifest.budget.queries_total < 0
  ) {
    return fail("budget_invalid", "budget");
  }
  if (!isObject(manifest.budget.per_class)) return fail("per_class_invalid", "budget.per_class");
  for (const klass of ATTACK_CLASSES) {
    if (
      !Number.isInteger(manifest.budget.per_class[klass]) ||
      manifest.budget.per_class[klass] < 0
    ) {
      return fail("per_class_count_invalid", `budget.per_class.${klass}`);
    }
  }
  if (!Number.isInteger(manifest.attempt_count) || manifest.attempt_count < 0) {
    return fail("attempt_count_invalid", "attempt_count");
  }
  if (!Array.isArray(manifest.attempts)) return fail("attempts_invalid", "attempts");
  if (manifest.attempts.length !== manifest.attempt_count) {
    return fail("attempt_count_mismatch", "attempts");
  }
  for (let i = 0; i < manifest.attempts.length; i += 1) {
    const result = validateAttempt(manifest.attempts[i], i);
    if (!result.ok) return result;
  }
  if (!isObject(manifest.counts)) return fail("counts_invalid", "counts");
  return { ok: true };
}

export function validateCampaignRecord(record) {
  if (!isObject(record)) return fail("record_not_object", "$");
  if (record.record_version !== "simurgh.stage4g.record.v1") {
    return fail("record_version_invalid", "record_version");
  }
  if (!ATTEMPT.test(record.attempt_id)) return fail("attempt_id_invalid", "attempt_id");
  if (!ATTACK_CLASSES.includes(record.target_class)) {
    return fail("target_class_invalid", "target_class");
  }
  if (!ATTACK_CLASSES.includes(record.resolved_class)) {
    return fail("resolved_class_invalid", "resolved_class");
  }
  if (!VERDICTS.includes(record.verdict)) return fail("verdict_invalid", "verdict");
  if (!RECORD_TYPES.includes(record.record_type)) return fail("record_type_invalid", "record_type");
  if (!Array.isArray(record.reason_codes)) return fail("reason_codes_invalid", "reason_codes");
  if (!HEX.test(record.sealed_inputs_hash)) {
    return fail("sealed_inputs_hash_invalid", "sealed_inputs_hash");
  }
  if (record.record_type === "EP") {
    if (!["I", "II"].includes(record.target_class)) {
      return fail("ep_class_invalid", "target_class");
    }
    if (!HEX.test(record.evidence_pack_hash)) {
      return fail("evidence_pack_hash_invalid", "evidence_pack_hash");
    }
    if (!HEX.test(record.evidence_pack_sig_hash)) {
      return fail("evidence_pack_sig_hash_invalid", "evidence_pack_sig_hash");
    }
  }
  return { ok: true };
}
