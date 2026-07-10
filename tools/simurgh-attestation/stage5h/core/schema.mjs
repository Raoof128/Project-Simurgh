// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — structural schema check (raw 300). Shape only; it deliberately EXEMPTS scope_statement
// presence (304 owns that) and withheld-justification TYPING (306 owns that). External trust material
// must never be embedded in the bundle.
import { TIER, CONSEQUENCE, VSD_SCHEMAS } from "../constants.mjs";

const RAW = 300;
const FORBIDDEN_EMBEDDED = [
  "pin",
  "host_registry",
  "hostRegistry",
  "trust_root",
  "embedded_trust_material",
];
const fail = (reason, claim_id) => ({
  ok: false,
  raw: RAW,
  reason,
  ...(claim_id ? { claim_id } : {}),
});

export function checkSchema(ctx) {
  const b = ctx.bundle;
  if (!b || typeof b !== "object") return fail("bundle_missing");
  if (b.schema !== VSD_SCHEMAS.disclosure_attestation) return fail("bad_attestation_schema");
  for (const k of FORBIDDEN_EMBEDDED) {
    if (Object.prototype.hasOwnProperty.call(b, k)) return fail("embedded_trust_material");
  }
  for (const k of [
    "claim_inventory",
    "producer_identity",
    "verifier_identity",
    "inventory_census_digest",
    "attestation_signature",
  ]) {
    if (b[k] == null) return fail(`missing_${k}`);
  }
  for (const k of ["review_receipts", "artefacts_ref", "verdict_table"]) {
    if (!Array.isArray(b[k])) return fail(`missing_${k}`);
  }
  const inv = b.claim_inventory;
  if (inv.schema !== VSD_SCHEMAS.claim_inventory) return fail("bad_inventory_schema");
  const content = inv.content;
  if (!content || !Array.isArray(content.claims) || content.claims.length === 0) {
    return fail("empty_claims");
  }
  if (content.producer_identity_digest == null) return fail("missing_producer_identity_digest");

  const seen = new Set();
  for (const c of content.claims) {
    if (typeof c.claim_id !== "string" || !c.claim_id) return fail("claim_id_invalid");
    if (seen.has(c.claim_id)) return fail("duplicate_claim_id", c.claim_id);
    seen.add(c.claim_id);
    if (c.claim_text_digest == null) return fail("missing_claim_text_digest", c.claim_id);
    if (!TIER.order.includes(c.declared_tier)) return fail("bad_declared_tier", c.claim_id);
    if (!CONSEQUENCE.order.includes(c.declared_consequence)) {
      return fail("bad_declared_consequence", c.claim_id);
    }
    const m = c.artefact_manifest;
    if (!m || !Array.isArray(m.present) || !Array.isArray(m.withheld)) {
      return fail("bad_artefact_manifest", c.claim_id);
    }
    if (c.declared_tier === "restricted") {
      if (
        !c.restriction ||
        c.restriction.reason == null ||
        c.restriction.right_scaling_note == null
      ) {
        return fail("missing_restriction", c.claim_id);
      }
    }
    if (TIER.index(c.declared_tier) >= TIER.index("controlled")) {
      if (c.method_summary_digest == null) return fail("missing_method_summary_digest", c.claim_id);
      if (
        !c.recompute ||
        c.recompute.recipe_digest == null ||
        c.recompute.committed_output_digest == null
      ) {
        return fail("missing_recompute", c.claim_id);
      }
    }
  }
  for (const r of b.review_receipts) {
    if (r.schema !== VSD_SCHEMAS.review_receipt || !r.content || r.host_signature == null) {
      return fail("bad_review_receipt");
    }
  }
  return { ok: true };
}
