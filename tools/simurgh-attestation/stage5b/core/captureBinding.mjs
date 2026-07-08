// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — capture binding / No Author's Map (spec §1 Law 2, §3; plan Task 4).
// The anti-circularity core: every attack runs on a PRECOMMITTED readout the adversary did not
// author. 214 is a RECONCILIATION check (the frozen tensors recompute to the committed root — an
// attacker cannot swap the telemetry); it deliberately ignores WHICH key signed (we hold every
// key, so key-separation would be theater — spec §1 P0-1). 215 binds the readout to the
// charter's precommitted DECLARATION and validates the ceremony shape.
// Motto: AnthropicSafe First, then ReviewerSafe.
import {
  tensorCommitment,
  tensorCommitmentRoot,
  validateCeremony,
} from "../lanec/ceremonyCore.mjs";

// Recompute the sorted-commitment root from a frozen_capture's (salt, bytes) maps — the exact
// shape the Python harness emits (commitments / salts / tensors_b64 parallel maps).
export function frozenCaptureRoot(frozenCapture) {
  const keys = Object.keys(frozenCapture.tensors_b64 || {});
  const recomputed = keys.map((k) =>
    tensorCommitment(frozenCapture.salts[k], frozenCapture.tensors_b64[k])
  );
  return tensorCommitmentRoot(recomputed);
}

// 214 — No Author's Map: the frozen tensors must reconcile to the committed root. Key identity
// is intentionally NOT examined (honest bound).
export function checkNoAuthorsMap(captureBinding, frozenCapture) {
  if (!captureBinding || !frozenCapture)
    return { raw: 214, reason: "var_capture_authorship_invalid", detail: { missing: true } };
  const root = frozenCaptureRoot(frozenCapture);
  if (root !== captureBinding.tensor_commitment_root)
    return {
      raw: 214,
      reason: "var_capture_authorship_invalid",
      detail: { tensor_root_mismatch: true },
    };
  return { raw: 0, reason: "green" };
}

// 215 — capture ceremony invalid: the ceremony record shape must validate, and the binding's
// declaration must be exactly the one the charter precommitted (No Post-Hoc Attack, capture side).
export function checkCaptureCeremony(captureBinding, charter) {
  const bad = (detail) => ({ raw: 215, reason: "var_capture_ceremony_invalid", detail });
  if (!captureBinding || typeof captureBinding !== "object") return bad({ shape: true });
  const ceremonyErr = validateCeremony(captureBinding.ceremony);
  if (ceremonyErr) return bad({ ceremony: ceremonyErr.error });
  if (captureBinding.declaration_digest !== charter.capture_declaration_digest)
    return bad({ declaration_not_precommitted: true });
  if (captureBinding.ceremony.declaration_digest !== charter.capture_declaration_digest)
    return bad({ ceremony_declaration_mismatch: true });
  return { raw: 0, reason: "green" };
}
