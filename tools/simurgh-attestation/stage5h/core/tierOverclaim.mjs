// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — tier overclaim (raw 311): declared_tier > proven_tier. Also the surface for the
// "honest recompute-output mismatch" case (public declared, recompute did not match → proven < public).
import { TIER } from "../constants.mjs";
import { buildVerdictTable } from "./tierLattice.mjs";

const RAW = 311;

export function checkTierOverclaim(ctx) {
  const rows = new Map(buildVerdictTable(ctx).map((r) => [r.claim_id, r]));
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    const proven = rows.get(c.claim_id).proven_tier;
    if (TIER.index(c.declared_tier) > TIER.index(proven)) {
      return { ok: false, raw: RAW, reason: "tier_overclaim", claim_id: c.claim_id };
    }
  }
  return { ok: true };
}
