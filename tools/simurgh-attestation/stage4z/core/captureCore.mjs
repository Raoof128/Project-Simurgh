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
