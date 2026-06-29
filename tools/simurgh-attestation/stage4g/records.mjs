// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  campaignHash,
  signCampaignRecord,
  verifyCampaignRecordSignature,
} from "./campaignCrypto.mjs";
import { validateCampaignRecord } from "./schemas.mjs";

export function recordHash(record) {
  return campaignHash(record);
}

export function buildCampaignRecord({
  attempt_id,
  target_class,
  resolved_class,
  verdict,
  reason_codes,
  sealed_inputs_hash,
}) {
  return {
    record_version: "simurgh.stage4g.record.v1",
    attempt_id,
    target_class,
    resolved_class,
    verdict,
    record_type: "CR",
    reason_codes,
    sealed_inputs_hash,
  };
}

export function buildEvidencePackRecord({
  attempt_id,
  target_class,
  resolved_class,
  verdict,
  reason_codes,
  sealed_inputs_hash,
  evidence_pack_hash,
  evidence_pack_sig_hash,
}) {
  if (!["I", "II"].includes(target_class)) {
    throw new Error("ep_record_requires_gateway_mediated_class");
  }
  return {
    record_version: "simurgh.stage4g.record.v1",
    attempt_id,
    target_class,
    resolved_class,
    verdict,
    record_type: "EP",
    reason_codes,
    sealed_inputs_hash,
    evidence_pack_hash,
    evidence_pack_sig_hash,
  };
}

export function buildAbortRecord({ attempt_id, target_class, reason_codes, sealed_inputs_hash }) {
  return {
    record_version: "simurgh.stage4g.record.v1",
    attempt_id,
    target_class,
    resolved_class: target_class,
    verdict: "aborted",
    record_type: "abort",
    reason_codes,
    sealed_inputs_hash,
  };
}

export function signRecordEnvelope(payload, privateKey) {
  const validation = validateCampaignRecord(payload);
  if (!validation.ok) {
    throw new Error(`invalid campaign record: ${validation.reason} at ${validation.path}`);
  }
  return {
    payload,
    record_hash: recordHash(payload),
    signature: signCampaignRecord(payload, privateKey),
  };
}

export function verifyRecordEnvelope(envelope, publicKey) {
  const validation = validateCampaignRecord(envelope?.payload);
  if (!validation.ok) return validation;
  if (envelope.record_hash !== recordHash(envelope.payload)) {
    return { ok: false, reason: "record_hash_mismatch" };
  }
  if (!verifyCampaignRecordSignature(envelope.payload, envelope.signature, publicKey)) {
    return { ok: false, reason: "record_signature_invalid" };
  }
  return { ok: true };
}
