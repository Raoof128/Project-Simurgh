// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — §6-E Disclosure Debt. Every withheld artefact's available_at_tier makes redactions
// TYPED IOUs: the signed ledger of what would become checkable at which access level. Pure projection.
// NON-CLAIM: debt enumeration ≠ justification validity — the verifier checks the ledger is complete
// and typed, not that a `safety_hazard` justification is warranted (withheld_artefact_content_deferred).
export function disclosureDebt(claims) {
  const items = [];
  for (const c of claims) {
    for (const w of c.artefact_manifest.withheld) {
      items.push({
        claim_id: c.claim_id,
        artefact_id: w.artefact_id,
        available_at_tier: w.available_at_tier,
        justification_type: w.justification_type,
      });
    }
  }
  const by_tier = {};
  for (const it of items) by_tier[it.available_at_tier] = (by_tier[it.available_at_tier] || 0) + 1;
  return { items, total: items.length, by_tier };
}
