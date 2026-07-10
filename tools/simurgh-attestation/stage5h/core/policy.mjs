// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — strict policy floor (raw 314). The default equals the structural warrant (an honest
// no-op); a caller may configure a stricter local floor per declared consequence (e.g. a
// threshold_crossing claim must reach `public`). Returns policy_accepted alongside the verdict.
import { TIER, DEFAULT_POLICY } from "../constants.mjs";
import { buildVerdictTable } from "./tierLattice.mjs";

const RAW = 314;

export function evaluatePolicy(ctx, policy = DEFAULT_POLICY) {
  const rows = new Map(buildVerdictTable(ctx).map((r) => [r.claim_id, r]));
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    const required = policy.min_tier_for[c.declared_consequence];
    const proven = rows.get(c.claim_id).proven_tier;
    if (TIER.index(proven) < TIER.index(required)) {
      return { ok: false, raw: RAW, reason: "policy_rejected", claim_id: c.claim_id };
    }
  }
  return { ok: true };
}
