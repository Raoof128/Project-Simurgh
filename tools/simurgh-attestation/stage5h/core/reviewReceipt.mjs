// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — secure-review host receipts.
//   308 checkReviewHostPinned — a SUPPLIED registry must contain the receipt's host (undefined
//       registry is an environment failure → 315, owned by vsdCore, never 308)
//   309 checkReviewReceipt     — host signature + inventory_digest binding. A valid receipt whose
//       verdict is "not_reproduced" is NEVER 309 — it is a tier fact (proven < controlled).
import { DOMAIN } from "../constants.mjs";
import { verifyContent } from "./signatures.mjs";

const f = (raw, reason) => ({ ok: false, raw, reason });

export function checkReviewHostPinned(ctx) {
  const receipts = ctx.bundle.review_receipts;
  if (receipts.length === 0) return { ok: true };
  const reg = ctx.hostRegistry; // undefined is handled by vsdCore (315), not here
  const fps = new Set(reg.map((h) => h.host_key_fingerprint));
  for (const r of receipts) {
    if (!fps.has(r.content.host_key_fingerprint)) return f(308, "review_host_unpinned");
  }
  return { ok: true };
}

export function checkReviewReceipt(ctx) {
  const b = ctx.bundle;
  if (b.review_receipts.length === 0) return { ok: true }; // nothing to authenticate
  const reg = ctx.hostRegistry;
  const byFp = new Map(reg.map((h) => [h.host_key_fingerprint, h]));
  for (const r of b.review_receipts) {
    if (r.content.inventory_digest !== b.claim_inventory.inventory_digest) {
      return f(309, "receipt_inventory_mismatch");
    }
    const host = byFp.get(r.content.host_key_fingerprint);
    const identity = {
      public_key_pem: host.public_key_pem,
      key_fingerprint: host.host_key_fingerprint,
    };
    let ok = false;
    try {
      ok = verifyContent(identity, DOMAIN.review_receipt, r.content, r.host_signature);
    } catch {
      return f(309, "receipt_signature_invalid");
    }
    if (!ok) return f(309, "receipt_signature_invalid");
    // verdict "not_reproduced" is a VALID receipt (a tier fact) — never an error here.
  }
  return { ok: true };
}
