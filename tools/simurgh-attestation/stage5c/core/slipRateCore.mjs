// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — slip-rate + floor-monotonicity (plan Task 6; codes 235/236). Motto: AnthropicSafe
// First, then ReviewerSafe. Slip-rate is an exact INTEGER rational pair (never a float —
// canonicalJson rounds/throws). Floor-monotonicity is by-construction for leakage v1→v2 (PF3);
// 236's teeth are for a synthetic/adversarial claim.
import { COMPOSED_MR_TABLE, applyMR5C } from "./mrRuleset.mjs";
import { flagged } from "./gateReductions.mjs";

const FAMILY_OF = new Map(COMPOSED_MR_TABLE.map((r) => [r.id, r.family]));

// Per (mechanism, mr_family): {caught, slipped, slip_rate_num, slip_rate_den}. Denominator is
// caught+slipped only (not_applicable + degenerate excluded). den=0 ⇒ rate 0 (guarded, Lean edge).
export function slipRates(grid, baseCorpus) {
  const mech = new Map(baseCorpus.map((b) => [b.base_id, b.mechanism]));
  const groups = new Map();
  for (const c of grid) {
    if (c.cell_class !== "caught" && c.cell_class !== "slipped") continue;
    const key = `${mech.get(c.base_id)}|${FAMILY_OF.get(c.mr_id)}`;
    const g = groups.get(key) ?? { caught: 0, slipped: 0 };
    if (c.cell_class === "caught") g.caught += 1;
    else g.slipped += 1;
    groups.set(key, g);
  }
  const rows = [];
  for (const [key, g] of groups) {
    const [mechanism, mr_family] = key.split("|");
    rows.push({
      mechanism,
      mr_family,
      caught: g.caught,
      slipped: g.slipped,
      slip_rate_num: g.slipped,
      slip_rate_den: g.caught + g.slipped,
    });
  }
  rows.sort((a, b) =>
    `${a.mechanism}|${a.mr_family}`.localeCompare(`${b.mechanism}|${b.mr_family}`)
  );
  return rows;
}

// 235 — published rates must equal the recomputed rates (order-insensitive by key).
export function checkSlipRates(grid, baseCorpus, published) {
  const recomputed = slipRates(grid, baseCorpus);
  const key = (r) => `${r.mechanism}|${r.mr_family}`;
  const byKey = new Map(recomputed.map((r) => [key(r), r]));
  if (published.length !== recomputed.length)
    return {
      raw: 235,
      reason: "vsb_slip_rate_recompute_mismatch",
      detail: { count: published.length },
    };
  for (const p of published) {
    const r = byKey.get(key(p));
    if (
      !r ||
      p.caught !== r.caught ||
      p.slipped !== r.slipped ||
      p.slip_rate_num !== r.slip_rate_num ||
      p.slip_rate_den !== r.slip_rate_den
    )
      return { raw: 235, reason: "vsb_slip_rate_recompute_mismatch", detail: { key: key(p) } };
  }
  return null;
}

// Slip set under a leakage version, restricted to bases the OLDER version flags (the domain where
// slipSet(vNew) ⊆ slipSet(vOld) holds by construction). Returns a Set of "mr|base" keys.
function leakageSlipSet(basesWithText, mrIds, version, domainVersion) {
  const set = new Set();
  for (const b of basesWithText) {
    if (b.mechanism !== "leakage") continue;
    if (!flagged("leakage", domainVersion, b.base_text)) continue; // domain: older flags the base
    for (const mrId of mrIds) {
      const mutated = applyMR5C(mrId, b.base_text);
      if (mutated === b.base_text) continue; // degenerate: no mutation
      if (!flagged("leakage", version, mutated)) set.add(`${mrId}|${b.base_id}`);
    }
  }
  return set;
}

export function floorMonotonicity(basesWithText, mrIds) {
  // Only leakage has >1 version.
  const older = "v1";
  const newer = "v2";
  const olderSet = leakageSlipSet(basesWithText, mrIds, older, older);
  const newerSet = leakageSlipSet(basesWithText, mrIds, newer, older);
  const subset = [...newerSet].every((k) => olderSet.has(k));
  return [
    {
      mechanism: "leakage",
      older_version: older,
      newer_version: newer,
      newer_slip_subset_of_older: subset,
    },
  ];
}

// 236 — a published row claiming a regression (subset === false) fails closed at BOTH tiers
// (public: the boolean is a structural claim). Audit additionally recomputes and verifies the
// claim is accurate (a dishonest `true`, or an inverted-version lie, is caught).
export function checkFloorMonotonicity(published, { tier = "audit", basesWithText, mrIds } = {}) {
  const bad = (detail) => ({ raw: 236, reason: "vsb_floor_monotonicity_invalid", detail });
  for (const row of published) {
    if (row.newer_slip_subset_of_older !== true) return bad({ claimed_regression: row.mechanism });
    if (tier === "audit") {
      const olderSet = leakageSlipSet(basesWithText, mrIds, row.older_version, row.older_version);
      const newerSet = leakageSlipSet(basesWithText, mrIds, row.newer_version, row.older_version);
      const subset = [...newerSet].every((k) => olderSet.has(k));
      if (!subset) return bad({ recompute_contradicts: row.mechanism });
    }
  }
  return null;
}
