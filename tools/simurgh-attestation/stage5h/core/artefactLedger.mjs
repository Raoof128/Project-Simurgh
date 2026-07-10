// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — artefact ledger (Law 3, Completeness). Three single-owner checks:
//   305 checkArtefactAccounting — every referenced artefact is present ⊎ withheld (disjoint)
//   306 checkRedactionTyping    — every withheld entry carries a typed justification + tier
//   307 checkArtefactDigests    — every present artefact's committed digest matches its bytes
import { JUSTIFICATION_TYPES, TIER } from "../constants.mjs";
import { artifactDigest } from "./digests.mjs";

const f = (raw, reason, claim_id) => ({
  ok: false,
  raw,
  reason,
  ...(claim_id ? { claim_id } : {}),
});

export function checkArtefactAccounting(ctx) {
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    const m = c.artefact_manifest;
    const presentIds = new Set(m.present.map((p) => p.artefact_id));
    const withheldIds = new Set(m.withheld.map((w) => w.artefact_id));
    for (const id of presentIds) {
      if (withheldIds.has(id)) return f(305, "artefact_in_both_ledgers", c.claim_id);
    }
    // referenced = recipe inputs (the artefacts the claim actually consumes)
    const recipe = ctx.recipes ? ctx.recipes[c.claim_id] : undefined;
    const referenced = recipe ? recipe.input_artefact_ids : [];
    for (const id of referenced) {
      if (!presentIds.has(id) && !withheldIds.has(id)) {
        return f(305, "artefact_unaccounted", c.claim_id);
      }
    }
  }
  return { ok: true };
}

export function checkRedactionTyping(ctx) {
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    for (const w of c.artefact_manifest.withheld) {
      if (!JUSTIFICATION_TYPES.includes(w.justification_type)) {
        return f(306, "redaction_untyped", c.claim_id);
      }
      if (!TIER.order.includes(w.available_at_tier)) {
        return f(306, "redaction_untyped", c.claim_id);
      }
    }
  }
  return { ok: true };
}

export function checkArtefactDigests(ctx) {
  for (const c of ctx.bundle.claim_inventory.content.claims) {
    for (const p of c.artefact_manifest.present) {
      const bytes = ctx.artefactBytes ? ctx.artefactBytes[p.artefact_id] : undefined;
      if (bytes === undefined) return f(307, "artefact_bytes_missing", c.claim_id);
      if (artifactDigest(bytes) !== p.digest) return f(307, "artefact_digest_mismatch", c.claim_id);
    }
  }
  return { ok: true };
}
