// SPDX-License-Identifier: AGPL-3.0-or-later
// The Friction Precedence Law decision function (4Q spec §1.2, §2.3). Frozen check
// order 80→83→81→82→89→86→84→85→87→88 — 83 before 81 so absent receipts never
// surface as signature errors; 89 right after structural validity because
// laundering masks downstream mismatches. Pure, no I/O, fail closed.
// Motto: AnthropicSafe First, then ReviewerSafe.
import {
  validateEnvelope,
  validateReceipt,
  validateExemption,
  validateCrossing,
} from "./schemaCore.mjs";
import { approvalReceiptDigest, approvalExemptionDigest, crossingDigest } from "./digest.mjs";
import { positionsOf } from "./chainCore.mjs";
import { MAX_WINDOW_STRADDLE } from "../constants.mjs";

const refuse = (raw, reason) => ({ raw, reason });

export function decide({
  envelope,
  receipt,
  exemption,
  crossing,
  chainEntries = [],
  chainVerdict = { raw: 0 },
  verifySignature,
  displayExpected,
}) {
  // 80 — structural envelope tier (a malformed crossing is also this tier)
  const ve = validateEnvelope(envelope);
  if (!ve.ok) return refuse(80, ve.reason);
  const vc = validateCrossing(crossing);
  if (!vc.ok) return refuse(80, "schema_invalid");
  const verify = typeof verifySignature === "function" ? verifySignature : () => false;
  // Freeze 5 — No Silent Exemption branch (variant binding kind === "exemption").
  // Evaluated right after the structural tier so an exempt crossing never trips 83.
  // The exemption is a SIGNED "receipt of absence", never a silent gap.
  if (crossing.approval_binding_kind === "exemption") {
    if (receipt !== null && receipt !== undefined) return refuse(84, "binding_kind_conflict");
    const vx = validateExemption(exemption);
    if (!vx.ok) return refuse(84, "approval_binding_unresolved");
    const { signature: exs, ...unsignedX } = exemption;
    if (!verify(exemption.harness_public_key_digest, unsignedX, exs))
      return refuse(81, "exemption_signature_invalid");
    if (crossing.approval_binding_digest !== approvalExemptionDigest(exemption))
      return refuse(84, "approval_binding_digest_mismatch");
    // exemption must bind THIS crossing (action/request/boundary/run/window) AND
    // this policy + harness context — otherwise a valid exemption from a different
    // run/policy/harness could be replayed in.
    if (
      exemption.action_digest !== crossing.action_digest ||
      exemption.request_digest !== crossing.request_digest ||
      exemption.boundary_kind !== crossing.boundary_kind ||
      exemption.run_id_digest !== crossing.run_id_digest ||
      exemption.stage4n_window_anchor_digest !== envelope.stage4n_window_anchor_digest ||
      exemption.exemption_policy_id !== envelope.policy_id ||
      exemption.harness_public_key_digest !== envelope.harness_public_key_digest ||
      exemption.harness_public_key_digest !== crossing.harness_public_key_digest
    )
      return refuse(88, "friction_receipt_binding_mismatch");
    // affirmative policy allowlist (default empty ⇒ refuse)
    if (!envelope.admissible_exemption_boundary_kinds.includes(crossing.boundary_kind))
      return refuse(87, "approval_exemption_not_permitted_by_policy");
    // an exempt crossing is still census-counted: a laundered chain fails here too
    if (chainVerdict.raw !== 0) return refuse(89, chainVerdict.reason);
    return {
      raw: 0,
      reason: "accepted_exempt",
      receipt_digest: approvalExemptionDigest(exemption),
      crossing_digest: crossingDigest(crossing),
    };
  }
  // Receipt-path binding conflict: kind === "receipt" but an exemption was also supplied.
  if (exemption !== null && exemption !== undefined) return refuse(84, "binding_kind_conflict");
  // 83 — receipt presence + shape
  const vr = validateReceipt(receipt);
  if (!vr.ok) return refuse(83, vr.reason);
  // 81 — signatures; `verify` was resolved above (no verifier supplied = fail closed)
  const { signature: rs, ...unsignedReceipt } = receipt;
  if (!verify(receipt.approver_public_key_digest, unsignedReceipt, rs))
    return refuse(81, "approval_signature_invalid");
  const { signature: cs, ...unsignedCrossing } = crossing;
  if (!verify(crossing.harness_public_key_digest, unsignedCrossing, cs))
    return refuse(81, "crossing_signature_invalid");
  // 82 — window validity, then straddle (freeze 3)
  if (
    crossing.crossing_epoch < receipt.valid_from_epoch ||
    crossing.crossing_epoch > receipt.valid_until_epoch
  )
    return refuse(82, "run_epoch_outside_validity_window");
  const straddle = Math.min(envelope.max_window_straddle, MAX_WINDOW_STRADDLE);
  // Patch 3: straddle is measured from receipt_epoch (mint), NOT valid_from_epoch.
  if (crossing.crossing_epoch - receipt.receipt_epoch > straddle)
    return refuse(82, "window_straddle_exceeded");
  // 89 — the caller's verifyChain verdict propagates here, in frozen position
  if (chainVerdict.raw !== 0) return refuse(89, chainVerdict.reason);
  // 86 — two-key pincer: digests, never labels
  if (
    receipt.approver_public_key_digest === envelope.harness_public_key_digest ||
    receipt.approver_public_key_digest === crossing.harness_public_key_digest
  )
    return refuse(86, "approver_key_equals_harness_key");
  // 84 — causal claw (receipt path: kind === "receipt", digest must resolve)
  const receiptDigest = approvalReceiptDigest(receipt);
  if (crossing.approval_binding_digest !== receiptDigest)
    return refuse(84, "approval_binding_digest_mismatch");
  // 85 — chain claw: positions are RECOMPUTED, never read
  const approvalPos = positionsOf(chainEntries, receiptDigest);
  const crossingPos = positionsOf(chainEntries, crossingDigest(crossing));
  if (approvalPos === -1 || crossingPos === -1) return refuse(85, "chain_position_unrecomputable");
  if (approvalPos >= crossingPos) return refuse(85, "approval_not_before_crossing");
  // 87 — declared policy (freeze 1)
  if (receipt.approver_public_key_digest !== envelope.approver_public_key_digest)
    return refuse(87, "approver_not_declared_in_policy");
  if (!envelope.boundary_kinds_requiring_approval.includes(crossing.boundary_kind))
    return refuse(87, "boundary_kind_not_covered");
  // 88 — full binding (spec §2.4/§2.5): action, request, kind, run, window, display
  if (receipt.action_digest !== crossing.action_digest) return refuse(88, "action_digest_mismatch");
  if (receipt.request_digest !== crossing.request_digest)
    return refuse(88, "request_digest_mismatch");
  if (receipt.boundary_kind !== crossing.boundary_kind) return refuse(88, "boundary_kind_mismatch");
  if (
    receipt.run_id_digest !== crossing.run_id_digest ||
    receipt.run_id_digest !== envelope.run_id_digest
  )
    return refuse(88, "run_id_mismatch");
  if (receipt.stage4n_window_anchor_digest !== envelope.stage4n_window_anchor_digest)
    return refuse(88, "window_anchor_mismatch");
  if (displayExpected !== undefined && receipt.approval_display_digest !== displayExpected)
    return refuse(88, "display_digest_mismatch");
  return {
    raw: 0,
    reason: "accepted",
    receipt_digest: receiptDigest,
    crossing_digest: crossingDigest(crossing),
  };
}
