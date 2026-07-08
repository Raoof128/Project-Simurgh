// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — Lane C ceremony validation shim (plan Task 2, reviewer blocker 2).
// A 5B-OWNED port of the 4Z ceremony-shape logic — stage4z is imported NOWHERE and edited
// NOWHERE. Validated in CI WITHOUT importing torch: a malformed ceremony cannot ship while the
// real capture stays offline. Motto: AnthropicSafe First, then ReviewerSafe.
import { createHash } from "node:crypto";

export const CAPTURE_OUTCOMES = Object.freeze(["captured", "capture_failed"]);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

// validateCeremony(ceremony) → null | { error }. The Lane C sealing shape.
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
  // Non-finite tensor values ABORT the capture in Python; a `captured` ceremony that still
  // carries a non_finite marker is malformed (undefined score_nano would follow).
  if (ceremony.outcome === "captured" && ceremony.non_finite === true)
    return { error: "captured_with_non_finite" };
  // Both-outcomes honesty: captured must bind the declaration it captured against; a failure
  // must carry a reason.
  if (ceremony.outcome === "captured" && typeof ceremony.declaration_digest !== "string")
    return { error: "captured_missing_declaration_digest" };
  if (ceremony.outcome === "capture_failed" && typeof ceremony.reason !== "string")
    return { error: "capture_failed_missing_reason" };
  return null;
}

// tensorCommitment(salt, bytesB64) — mirrors the Python `tensor_commitment`:
//   "sha256:" + sha256(str(salt) ‖ bytes). Bytes travel as base64 in JSON.
export function tensorCommitment(salt, bytesB64) {
  return (
    "sha256:" + sha(Buffer.concat([Buffer.from(String(salt)), Buffer.from(bytesB64, "base64")]))
  );
}

// The sorted-commitment root over a capture's tensor set (order-independent).
export function tensorCommitmentRoot(commitments) {
  return "sha256:" + sha([...commitments].sort().join("\n"));
}

// reconcileTensorRoot(record) → null | { error }. Recomputes each commitment from the pinned
// (salt, bytes) and checks the sorted root — the arithmetic half of No Author's Map (Task 4
// binds it to the charter declaration). record.tensors: [{ key, salt, bytes_b64 }].
export function reconcileTensorRoot(record) {
  if (!record || !Array.isArray(record.tensors)) return { error: "no_tensors" };
  const recomputed = record.tensors.map((t) => tensorCommitment(t.salt, t.bytes_b64));
  const root = tensorCommitmentRoot(recomputed);
  if (root !== record.tensor_commitment_root) return { error: "tensor_root_mismatch" };
  return null;
}
