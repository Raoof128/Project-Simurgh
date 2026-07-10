// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the Evidential-Inversion Detector (raw 312, Law 1 — headline). A claim's declared
// consequence may not exceed what its PROVEN tier warrants. Restricted evidence warrants only
// contextual claims, so C1/C2 on R0 fail closed.
import { CONSEQUENCE } from "../constants.mjs";
import { buildVerdictTable } from "./tierLattice.mjs";

const RAW = 312;

export function checkInversion(ctx) {
  const rows = new Map(buildVerdictTable(ctx).map((r) => [r.claim_id, r]));
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    const row = rows.get(c.claim_id);
    if (
      CONSEQUENCE.index(c.declared_consequence) > CONSEQUENCE.index(row.max_consequence_warranted)
    ) {
      return { ok: false, raw: RAW, reason: "evidential_inversion", claim_id: c.claim_id };
    }
  }
  return { ok: true };
}
