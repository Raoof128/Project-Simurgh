// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { RECEIPT_DOMAIN } from "./constants.mjs";
import { validateAgainstSchema } from "./schemaValidator.mjs";
import { domainBytes, isHex64, sha256Canonical } from "./stage4dCrypto.mjs";

export const RECEIPT_SCHEMA = JSON.parse(
  readFileSync(new URL("./schemas/receipt.schema.json", import.meta.url), "utf8")
);

export const REQUIRED = [
  "receipt_version",
  "run_id",
  "parent_session",
  "action_id",
  "step_index",
  "observation_event_hash",
  "action_type",
  "sink_id",
  "consequence_class",
  "boundary_id",
  "input_integrity_summary",
  "decision",
  "decision_reason_code",
  "decision_input",
  "model_identity_committed",
  "model_identity_origin",
  "prev_receipt_hash",
];

export const DIGEST_FIELDS = [
  "policy_hash",
  "sink_registry_hash",
  "consequence_lattice_hash",
  "resolved_args_digest",
  "policy_features_digest",
  "taint_labels_digest",
  "context_digest",
];

export function validateReceiptPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "schema_invalid" };
  }
  const schemaResult = validateAgainstSchema(payload, RECEIPT_SCHEMA);
  if (!schemaResult.ok) return schemaResult;
  for (const key of REQUIRED) {
    if (!(key in payload)) return { ok: false, reason: "schema_invalid", key };
  }
  if (payload.receipt_version !== "simurgh.receipt.v1")
    return { ok: false, reason: "schema_invalid" };
  if (!Number.isInteger(payload.step_index) || payload.step_index < 0) {
    return { ok: false, reason: "schema_invalid" };
  }
  if (!isHex64(payload.observation_event_hash) || !isHex64(payload.prev_receipt_hash)) {
    return { ok: false, reason: "schema_invalid" };
  }
  if (!["allow", "block"].includes(payload.decision))
    return { ok: false, reason: "schema_invalid" };
  if (!payload.decision_input || typeof payload.decision_input !== "object") {
    return { ok: false, reason: "schema_invalid" };
  }
  for (const key of DIGEST_FIELDS) {
    if (!isHex64(payload.decision_input[key])) return { ok: false, reason: "schema_invalid", key };
  }
  if (!["balanced", "permissive", "strict"].includes(payload.decision_input.policy_mode)) {
    return { ok: false, reason: "schema_invalid" };
  }
  if (typeof payload.decision_input.untrusted_reached_authority !== "boolean") {
    return { ok: false, reason: "schema_invalid" };
  }
  return { ok: true };
}

export function receiptHash(payload) {
  return sha256Canonical(payload);
}

export function signReceiptPayload(payload, privateKey) {
  const valid = validateReceiptPayload(payload);
  if (!valid.ok) throw new Error(valid.reason);
  return crypto.sign(null, domainBytes(RECEIPT_DOMAIN, payload), privateKey).toString("base64");
}

export function buildReceipt(payload, signature) {
  return { receipt_payload: payload, receipt_hash: receiptHash(payload), signature };
}

export function verifyReceipt(receipt, publicKey) {
  try {
    const valid = validateReceiptPayload(receipt?.receipt_payload);
    if (!valid.ok) return valid;
    if (receipt.receipt_hash !== receiptHash(receipt.receipt_payload)) {
      return { ok: false, reason: "receipt_hash_mismatch" };
    }
    const ok = crypto.verify(
      null,
      domainBytes(RECEIPT_DOMAIN, receipt.receipt_payload),
      publicKey,
      Buffer.from(String(receipt.signature || "").replace(/^base64:/, ""), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "receipt_signature_invalid" };
  } catch {
    return { ok: false, reason: "receipt_signature_invalid" };
  }
}
