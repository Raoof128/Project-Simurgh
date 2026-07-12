// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q raw 375: review-access receipt invalid. Broadened ownership (P0-5/P0-7): a required
// binding missing, the gate signature invalid, the signing-key fingerprint mismatched vs the COMMITTED
// gate_identity_policy_digest (gate-key substitution), or the receipt context not bound to this ceremony.
// Runs BEFORE 373 so the capability derivation always sees a complete, valid receipt.
import { R } from "./result.mjs";
import { gateIdentityPolicyDigest } from "./derive.mjs";

const REQUIRED_BINDS = [
  "commitment_session_id",
  "verified_anchor_set_digest",
  "checkpoint_evidence_digest",
  "quorum_policy_digest",
  "declared_release_surface_digest",
  "start_capability_root_digest",
];

export function checkReceipt(ctx) {
  const { bundle, cfg } = ctx;
  const r = bundle.review_access_authorisation_receipt;
  const cc = bundle.ceremony_contract;

  if (ctx.facts.receiptSigValid !== true) return R(375, "gate_signature_invalid");

  // gate-key substitution: recompute the committed gate identity from the receipt's gate fingerprint +
  // the pinned tsa-verifier fingerprint, and compare to the committed digest.
  const recomputedGateIdentity = gateIdentityPolicyDigest(
    r.gate_public_key_fingerprint,
    cfg.tsa_verifier_public_key_fingerprint
  );
  if (recomputedGateIdentity !== cc.gate_identity_policy_digest) {
    return R(375, "gate_fingerprint_mismatch");
  }

  const b = r.binds ?? {};
  for (const k of REQUIRED_BINDS) {
    if (!(k in b)) return R(375, "receipt_binding_missing", { field: k });
  }
  // context bound to THIS ceremony
  if (b.commitment_session_id !== bundle.commitment_session_id)
    return R(375, "receipt_context_unbound");
  if (b.verified_anchor_set_digest !== ctx.verifiedAnchorSetDigest)
    return R(375, "receipt_anchor_set_unbound");
  if (b.start_capability_root_digest !== r.start_capability_root_digest)
    return R(375, "receipt_capability_unbound");
  return null;
}
