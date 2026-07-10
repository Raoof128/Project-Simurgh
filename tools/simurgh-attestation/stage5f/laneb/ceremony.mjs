// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — Lane B blind-recompute ceremony (plan Task 17). Two-process / two-key SEPARATION (NOT
// independent-party verification). The receipt binds FIVE acyclic digests — deliberately NOT the full
// signed content (that includes the closeout, which binds the receipt digest → the cycle we removed).
// Order stays acyclic: result_chain_head → receipt → closeout → attestation.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { sha256Canon } from "../core/digests.mjs";
import { resultChainHeadDigest } from "../core/chain.mjs";
import { signBundle, keyFingerprint, contentOf } from "../core/signature.mjs";
import { createPublicKey, verify as edVerify, createPrivateKey } from "node:crypto";

export const LANEB_SCHEMA = "simurgh.vmp.blind_recompute_receipt.v1";

// Five load-bearing digests, none of which depends on the closeout or the attestation signature.
export function recomputeDigests(bundle, auditPrivate) {
  const chain = [bundle.roster_precommit, bundle.closeout];
  return {
    panel_plan_digest: bundle.roster_precommit.panel_plan_digest,
    cell_matrix_digest: sha256Canon(bundle.cells),
    completeness_digest: sha256Canon({
      completeness: bundle.completeness,
      coverage: bundle.coverage,
    }),
    capture_log_digest: sha256Canon(auditPrivate),
    result_chain_head_digest: resultChainHeadDigest(chain),
  };
}

export function receiptDigest(receipt) {
  const { signature, ...rest } = receipt;
  return sha256Canon(rest);
}

export function buildReceipt(digests, ceremonyPubPem, ceremonyPrivPem) {
  const content = {
    schema: LANEB_SCHEMA,
    ...digests,
    ceremony_key_pem: ceremonyPubPem,
    ceremony_key_fingerprint: keyFingerprint(ceremonyPubPem),
  };
  return { ...content, signature: signBundle(content, ceremonyPrivPem) };
}

// Two-process separation: recompute the digests INDEPENDENTLY and assert equality with the receipt.
// 0 = corroborated; 1 = a recomputed digest disagrees; 2 = bad/mis-pinned ceremony signature.
export function verifyReceipt(receipt, bundle, auditPrivate, pinnedCeremonyFingerprint) {
  try {
    const pem = receipt?.ceremony_key_pem;
    if (typeof pem !== "string" || keyFingerprint(pem) !== pinnedCeremonyFingerprint) return 2;
    const { signature, ...content } = receipt;
    const ok = edVerify(
      null,
      Buffer.from(canonicalJson(content), "utf8"),
      createPublicKey(pem),
      Buffer.from(signature, "base64")
    );
    if (!ok) return 2;
    const recomputed = recomputeDigests(bundle, auditPrivate);
    for (const k of Object.keys(recomputed)) if (receipt[k] !== recomputed[k]) return 1;
    // the attestation's closeout must bind THIS receipt (inseparability).
    if (bundle.closeout?.blind_recompute_receipt_digest !== receiptDigest(receipt)) return 1;
    return 0;
  } catch {
    return 2;
  }
}
