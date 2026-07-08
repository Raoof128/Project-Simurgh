// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — captureCore (spec §2, plan Task 5). Capture binding (193) + staleness receipt.
// Motto: AnthropicSafe First, then ReviewerSafe.
// Public tier: the map's tensor-commitment set must match the capture manifest's. Audit tier:
// each salted commitment must reopen as sha256(salt ‖ bytes). Tensors + salts live only in
// the audit bundle. The (model-revision digest × lens digest) pair is the staleness receipt.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { tensorCommitment } from "./tensorCore.mjs";

const fail = (detail) => ({ raw: 193, reason: "vwa_capture_binding_mismatch", detail });

export const CAPTURE_OUTCOMES = Object.freeze(["captured", "capture_failed"]);

// The staleness receipt: proves exactly which model revision + lens a readout came from
// (activation monitors are documented to go stale across model updates).
export function stalenessReceipt(capture) {
  return {
    model_revision_digest: capture.revision_digest,
    lens_digest: capture.lens_digest,
  };
}

export function validOutcome(capture) {
  return CAPTURE_OUTCOMES.includes(capture?.ceremony?.outcome);
}

// validateCeremony(ceremony) → null | {error}. The Lane C sealing shape, validated in CI
// WITHOUT loading torch — malformed ceremony JSON cannot ship while the compute stays offline.
export function validateCeremony(ceremony) {
  if (!ceremony || typeof ceremony !== "object") return { error: "not_an_object" };
  if (!CAPTURE_OUTCOMES.includes(ceremony.outcome)) return { error: "bad_outcome" };
  for (const field of [
    "timestamp",
    "model_id",
    "revision_digest",
    "lens_digest",
    "position_rule_id",
  ])
    if (typeof ceremony[field] !== "string" || !ceremony[field])
      return { error: `missing:${field}` };
  if (ceremony.position_rule_id !== "all_positions") return { error: "position_rule_not_total" };
  // A `captured` ceremony must carry the declaration digest it captured against; a
  // `capture_failed` ceremony must carry a reason (both-outcomes honesty).
  if (ceremony.outcome === "captured" && typeof ceremony.declaration_digest !== "string")
    return { error: "captured_missing_declaration_digest" };
  if (ceremony.outcome === "capture_failed" && typeof ceremony.reason !== "string")
    return { error: "capture_failed_missing_reason" };
  return null;
}

// Public 193: the map's committed tensor set must equal the capture manifest's.
export function checkCaptureBinding(map, capture) {
  if (canonicalJson(map?.commitments ?? null) !== canonicalJson(capture?.commitments ?? null))
    return fail("commitment_set_mismatch");
  return null;
}

// Audit 193: every commitment reopens as sha256(salt ‖ bytes) from the sealed audit bundle.
export function checkCaptureReopen(capture, audit) {
  for (const [key, commitment] of Object.entries(capture?.commitments ?? {})) {
    const salt = audit?.salts?.[key];
    const bytes = audit?.tensors?.[key];
    if (salt === undefined || bytes === undefined) return fail("audit_tensor_missing");
    if (tensorCommitment(salt, Uint8Array.from(bytes)) !== commitment)
      return fail("commitment_reopen_mismatch");
  }
  return null;
}
