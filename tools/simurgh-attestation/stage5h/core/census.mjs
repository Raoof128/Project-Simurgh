// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — audit-tier census (raw 313, audit-only). Three bijections: inventory↔verdict_table
// claim ids; artefacts_ref digests match the on-disk bytes; and the COMMITTED verdict_table equals the
// freshly recomputed one (a signed verdict table an editor changed but the attestation still covers
// would pass 301 — this catches the drift).
import { canonicalJson, artifactDigest } from "./digests.mjs";
import { buildVerdictTable } from "./tierLattice.mjs";

const RAW = 313;
const fail = (reason, claim_id) => ({
  ok: false,
  raw: RAW,
  reason,
  ...(claim_id ? { claim_id } : {}),
});

export function checkCensus(ctx) {
  const b = ctx.bundle;
  const claimIds = b.claim_inventory.content.claims.map((c) => c.claim_id).sort();
  const tableIds = b.verdict_table.map((r) => r.claim_id).sort();
  if (canonicalJson(claimIds) !== canonicalJson(tableIds)) {
    return fail("verdict_table_bijection");
  }
  for (const a of b.artefacts_ref) {
    const bytes = ctx.artefactBytes ? ctx.artefactBytes[a.artefact_id] : undefined;
    if (bytes === undefined || artifactDigest(bytes) !== a.digest) {
      return fail("artefact_census_mismatch", a.artefact_id);
    }
  }
  // committed table must equal the recomputed table (order-independent, keyed by claim_id)
  const recomputed = buildVerdictTable(ctx);
  const key = (rows) => canonicalJson([...rows].sort((x, y) => (x.claim_id < y.claim_id ? -1 : 1)));
  if (key(b.verdict_table) !== key(recomputed)) {
    return fail("verdict_table_mismatch");
  }
  return { ok: true };
}
