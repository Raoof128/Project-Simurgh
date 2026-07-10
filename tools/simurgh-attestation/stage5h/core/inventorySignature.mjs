// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — producer signature over the claim inventory + producer-identity binding (raw 302).
import { DOMAIN } from "../constants.mjs";
import { domainDigest, identityDigest } from "./digests.mjs";
import { verifyContent } from "./signatures.mjs";

const RAW = 302;
const fail = (reason) => ({ ok: false, raw: RAW, reason });

export function checkInventorySignature(ctx) {
  const b = ctx.bundle;
  const inv = b.claim_inventory;
  // the signed inventory must name the key that signed it
  if (identityDigest(b.producer_identity) !== inv.content.producer_identity_digest) {
    return fail("producer_identity_binding");
  }
  if (domainDigest(DOMAIN.claim_inventory, inv.content) !== inv.inventory_digest) {
    return fail("inventory_digest_mismatch");
  }
  let ok = false;
  try {
    ok = verifyContent(
      b.producer_identity,
      DOMAIN.claim_inventory,
      inv.content,
      inv.producer_signature
    );
  } catch {
    return fail("inventory_signature_invalid");
  }
  return ok ? { ok: true } : fail("inventory_signature_invalid");
}
