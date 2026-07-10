// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — membership + claim_digest linkage (raw 303). Owns the Maverick fixture at runtime:
// a scope swap that resigns the inventory leaves every review receipt's claim_digest matching NO
// recomputed claim → 303.
import { DOMAIN } from "../constants.mjs";
import { domainDigest } from "./digests.mjs";

const RAW = 303;
const fail = (reason, claim_id) => ({
  ok: false,
  raw: RAW,
  reason,
  ...(claim_id ? { claim_id } : {}),
});

export function checkInventoryMembership(ctx) {
  const b = ctx.bundle;
  const claims = b.claim_inventory.content.claims;
  const idSet = new Set(claims.map((c) => c.claim_id));
  const digestSet = new Set(claims.map((c) => domainDigest(DOMAIN.claim, c)));

  for (const row of b.verdict_table) {
    if (!idSet.has(row.claim_id)) return fail("verdict_row_outside_inventory", row.claim_id);
  }
  for (const r of b.review_receipts) {
    if (!digestSet.has(r.content.claim_digest)) return fail("receipt_claim_not_in_inventory");
  }
  return { ok: true };
}
