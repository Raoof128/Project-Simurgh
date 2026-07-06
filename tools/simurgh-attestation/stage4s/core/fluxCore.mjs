// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S budget flux law (4S spec §6). Motto: AnthropicSafe First, then
// ReviewerSafe. Per node: local_spend <= budget_allocated (110), and
// local_spend + Σ child.budget_allocated <= budget_allocated (109). 110 is
// checked before 109 (a local overspend is never mis-diagnosed as generic
// flux). Lean corollary (§15): total tree spend <= root budget for ANY tree
// shape, so structuring-by-delegation cannot be disguised.

function requireNonNegInt(v, what) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new TypeError(`${what} must be a non-negative integer`);
  }
}

// crossings: [{ bound_receipt_digest, spend }]. Only crossings bound to a real
// tree node contribute local spend; callers defer receiptless/orphan crossings
// (spec §11 binding-deferral) before calling verifyFlux.
export function verifyFlux(index, crossings) {
  const { byDigest, childrenOf } = index;

  const localSpend = new Map();
  for (const cr of crossings) {
    requireNonNegInt(cr.spend, "spend");
    const d = cr.bound_receipt_digest;
    if (!byDigest.has(d)) continue; // deferred to binding phase, not counted here
    localSpend.set(d, (localSpend.get(d) || 0) + cr.spend);
  }

  // Deterministic node order for stable first-failure.
  for (const d of [...byDigest.keys()].sort()) {
    const r = byDigest.get(d);
    requireNonNegInt(r.budget_allocated, "budget_allocated");
    const spend = localSpend.get(d) || 0;
    if (spend > r.budget_allocated) {
      return {
        raw: 110,
        reason: "local_spend_overflow",
        detail: { node: d, spend, budget: r.budget_allocated },
      };
    }
    let childBudget = 0;
    for (const cDigest of childrenOf.get(d) || []) {
      childBudget += byDigest.get(cDigest).budget_allocated;
    }
    if (spend + childBudget > r.budget_allocated) {
      return {
        raw: 109,
        reason: "budget_flux_violation",
        detail: {
          node: d,
          local_spend: spend,
          child_budget: childBudget,
          budget: r.budget_allocated,
        },
      };
    }
  }
  return { raw: 0, reason: "green" };
}
