// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the verifier spine. PURE: it never touches fs/env/child_process; the Node orchestrator
// runs the recompute kernel and passes ctx.recomputeResult. CHECK-MAJOR first-failure walk: each check
// iterates all claims internally before the next check runs, so the frozen order is over CHECKS.
//
// Order: record-authenticity gates (300–303) FIRST, then the fail-closed environment guards (315), then
// the remaining public checks (304–312), then audit census (313), then policy (314). 315 is the wrapper.
import { TIER, DEFAULT_POLICY } from "../constants.mjs";
import { checkSchema } from "./schema.mjs";
import { checkAttestationTrust } from "./attestationTrust.mjs";
import { checkInventorySignature } from "./inventorySignature.mjs";
import { checkInventoryMembership } from "./inventoryMembership.mjs";
import { checkScopeBinding } from "./scopeBinding.mjs";
import {
  checkArtefactAccounting,
  checkRedactionTyping,
  checkArtefactDigests,
} from "./artefactLedger.mjs";
import { checkReviewHostPinned, checkReviewReceipt } from "./reviewReceipt.mjs";
import { checkRecipeIntegrity } from "./recompute.mjs";
import { checkTierOverclaim } from "./tierOverclaim.mjs";
import { checkInversion } from "./inversion.mjs";
import { checkCensus } from "./census.mjs";
import { evaluatePolicy } from "./policy.mjs";
import { buildVerdictTable } from "./tierLattice.mjs";

const RECORD_AUTH_GATES = [
  [300, checkSchema],
  [301, checkAttestationTrust],
  [302, checkInventorySignature],
  [303, checkInventoryMembership],
];
const REMAINING_PUBLIC = [
  [304, checkScopeBinding],
  [305, checkArtefactAccounting],
  [306, checkRedactionTyping],
  [307, checkArtefactDigests],
  [308, checkReviewHostPinned],
  [309, checkReviewReceipt],
  [310, checkRecipeIntegrity],
  [311, checkTierOverclaim],
  [312, checkInversion],
];

function envFailClosed(ctx) {
  const claims = ctx.bundle.claim_inventory.content.claims;
  if (ctx.bundle.review_receipts.length > 0 && ctx.hostRegistry === undefined) {
    return { raw: 315, reason: "host_registry_unavailable" };
  }
  const publicClaims = claims.filter((c) => c.declared_tier === "public");
  if (publicClaims.length > 0) {
    if (ctx.recomputeResult == null) return { raw: 315, reason: "recompute_kernel_unavailable" };
    for (const c of publicClaims) {
      if (ctx.recomputeResult[c.claim_id] == null) {
        return { raw: 315, reason: "recompute_kernel_unavailable", claim_id: c.claim_id };
      }
    }
  }
  return null;
}

// Assemble the frozen result shape from the terminal state.
function assemble({ raw, reason, claim_id, tier, ctx, policyState }) {
  const record_authentic = ![300, 301, 302, 303].includes(raw);
  const attestation_valid = raw === 0 || raw === 314;
  const verdict_table = record_authentic && raw !== 315 ? buildVerdictTable(ctx) : [];
  return {
    raw,
    tier,
    record_authentic,
    attestation_valid,
    verdict_table,
    inventory_census_verified: tier === "audit" ? policyState.censusVerified : null,
    policy_evaluated: policyState.policyEvaluated,
    policy_accepted: policyState.policyAccepted,
    trust_reason: raw === 0 ? "ok" : { raw, reason, ...(claim_id ? { claim_id } : {}) },
  };
}

export function evaluateDisclosure(bundle, ctx = {}) {
  const full = { ...ctx, bundle, tier: ctx.tier ?? "public" };
  const tier = full.tier;
  const policyState = { policyEvaluated: false, policyAccepted: null, censusVerified: null };

  for (const [, fn] of RECORD_AUTH_GATES) {
    const r = fn(full);
    if (!r.ok) return assemble({ ...r, tier, ctx: full, policyState });
  }
  const env = envFailClosed(full);
  if (env) return assemble({ ...env, tier, ctx: full, policyState });

  for (const [, fn] of REMAINING_PUBLIC) {
    const r = fn(full);
    if (!r.ok) return assemble({ ...r, tier, ctx: full, policyState });
  }

  if (tier === "audit") {
    const c = checkCensus(full);
    policyState.censusVerified = c.ok;
    if (!c.ok) return assemble({ ...c, tier, ctx: full, policyState });
  }

  const pol = evaluatePolicy(full, full.policy ?? DEFAULT_POLICY);
  policyState.policyEvaluated = true;
  policyState.policyAccepted = pol.ok;
  if (!pol.ok) return assemble({ ...pol, tier, ctx: full, policyState });

  return assemble({ raw: 0, tier, ctx: full, policyState });
}

// Never throws; any internal error fails closed to 315.
export function evaluateDisclosureSafe(bundle, ctx = {}) {
  try {
    return evaluateDisclosure(bundle, ctx);
  } catch (e) {
    return {
      raw: 315,
      tier: ctx.tier ?? "public",
      record_authentic: true,
      attestation_valid: false,
      verdict_table: [],
      inventory_census_verified: null,
      policy_evaluated: false,
      policy_accepted: null,
      trust_reason: {
        raw: 315,
        reason: "internal_error_fail_closed",
        detail: String(e && e.message),
      },
    };
  }
}

export { TIER };
