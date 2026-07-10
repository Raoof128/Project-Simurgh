// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — scope presence (raw 304, Law 4). Owns scope_statement presence (schema 300 exempts
// it). The Law-4 GUARANTEE — that mutating scope changes the claim digest — is a property of the
// digest formula (domainDigest(DOMAIN.claim, claim) covers scope_statement); runtime scope-swap
// detection lands on 303 via the stale receipt path.
const RAW = 304;
const REQUIRED = ["checkpoint_kind", "environment", "pipeline_components", "uncertainty_note"];
const fail = (reason, claim_id) => ({ ok: false, raw: RAW, reason, claim_id });

export function checkScopeBinding(ctx) {
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    const s = c.scope_statement;
    if (!s || typeof s !== "object") return fail("scope_missing", c.claim_id);
    for (const k of REQUIRED) {
      if (s[k] == null) return fail("scope_incomplete", c.claim_id);
    }
    if (!Array.isArray(s.pipeline_components)) return fail("scope_incomplete", c.claim_id);
  }
  return { ok: true };
}
