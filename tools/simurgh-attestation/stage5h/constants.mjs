// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H — VSD: Verifiable Safety-claim Disclosure. Constants + the tier/consequence lattices.
// Motto: AnthropicSafe First, then ReviewerSafe.
//
// A safety claim carries a DECLARED consequence and a verifier-COMPUTED reproducibility tier. The
// verifier enforces the Right-Scaling Law (declared consequence ≤ what the proven tier warrants)
// and rejects tier overclaim. Tiers/consequences are ordered enums compared by exact small-integer
// ordinal — never binary floating-point or score arithmetic.
export {
  VSD_RAW_CODES as CODES,
  VSD_PUBLIC_CHECK_ORDER,
  VSD_AUDIT_CHECK_ORDER,
  VSD_AUDIT_ONLY_CODES,
  VSD_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

const TIER_ORDER = ["restricted", "controlled", "public"];
export const TIER = Object.freeze({
  order: Object.freeze([...TIER_ORDER]),
  index: (t) => {
    const i = TIER_ORDER.indexOf(t);
    if (i < 0) throw new Error(`invalid tier ${JSON.stringify(t)}`);
    return i; // ordinal only, never a measurement
  },
});

const CONSEQUENCE_ORDER = ["contextual", "supporting", "threshold_crossing"];
export const CONSEQUENCE = Object.freeze({
  order: Object.freeze([...CONSEQUENCE_ORDER]),
  index: (c) => {
    const i = CONSEQUENCE_ORDER.indexOf(c);
    if (i < 0) throw new Error(`invalid consequence ${JSON.stringify(c)}`);
    return i;
  },
});

export function tierGte(a, b) {
  return TIER.index(a) >= TIER.index(b);
}
export function consequenceGt(a, b) {
  return CONSEQUENCE.index(a) > CONSEQUENCE.index(b);
}

// warrant(tier) is a TYPED PAIR, not a scalar: the source distinguishes "full" (public/T1) from
// "qualified" (controlled/T2) support. Flattening that would discard typed information.
export const SUPPORT_QUALITY = Object.freeze({
  restricted: "descriptive",
  controlled: "qualified",
  public: "full",
});
export const MAX_CONSEQUENCE = Object.freeze({
  restricted: "contextual",
  controlled: "threshold_crossing",
  public: "threshold_crossing",
});
export function warrant(tier) {
  TIER.index(tier); // throws on unknown
  return Object.freeze({
    max_consequence: MAX_CONSEQUENCE[tier],
    support_quality: SUPPORT_QUALITY[tier],
  });
}

// Domain-separation prefixes (trailing newline is part of the bytes). digest = sha256(DOMAIN.x +
// canonicalJson(content)); signature = sign(key, DOMAIN.x + canonicalJson(content)). Every domain
// here is consumed by a named check — no dead domains. Scope statement and artefact manifest live
// INSIDE the claim's domain-digested content and get no separator of their own.
export const DOMAIN = Object.freeze({
  claim_inventory: "simurgh.vsd.claim_inventory.v1\n",
  claim: "simurgh.vsd.claim.v1\n",
  review_receipt: "simurgh.vsd.review_receipt.v1\n",
  recompute_recipe: "simurgh.vsd.recompute_recipe.v1\n",
  disclosure_attestation: "simurgh.vsd.disclosure_attestation.v1\n",
  inventory_census: "simurgh.vsd.inventory_census.v1\n",
});

export const VSD_SCHEMAS = Object.freeze({
  claim_inventory: "simurgh.vsd.claim_inventory.v1",
  claim: "simurgh.vsd.claim.v1",
  review_receipt: "simurgh.vsd.review_receipt.v1",
  recompute_recipe: "simurgh.vsd.recompute_recipe.v1",
  disclosure_attestation: "simurgh.vsd.disclosure_attestation.v1",
  inventory_census: "simurgh.vsd.inventory_census.v1",
});

export const JUSTIFICATION_TYPES = Object.freeze([
  "safety_hazard",
  "third_party_confidential",
  "security_sensitive",
]);

export const CAMPAIGN_STATUS = Object.freeze([
  "completed",
  "pending", // outbound pack prepared; awaiting an independent-party run (honest not-yet-done state)
  "declined",
  "no_show",
  "environment_failed",
]);

// The default policy equals the structural warrant — an honest no-op. It is the configuration point
// for stricter LOCAL floors (e.g. threshold_crossing requires public), never a hidden gate.
export const DEFAULT_POLICY = Object.freeze({
  min_tier_for: Object.freeze({
    contextual: "restricted",
    supporting: "controlled",
    threshold_crossing: "controlled",
  }),
});

export const VSD_RESERVED_SLOTS = Object.freeze([
  "consequence_self_rating_contest_deferred",
  "secure_review_host_independence_deferred",
  "withheld_artefact_content_deferred",
  "claim_text_semantic_binding_deferred",
  "real_risk_report_pilot_deferred",
]);
