// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q independence inflation (371) + profile floor (372). 371 fires FIRST (an anchor pair
// sharing a declared trust domain); 372 is pure arithmetic on the deduped set + the profile floor.
import { R } from "./result.mjs";

// 371 — a declared anchor PAIR collapses to one trust domain (No Independence Inflation).
export function checkIndependenceInflation(ctx) {
  const domains = ctx.anchors.map((a) => a.trust_domain);
  if (domains.length !== new Set(domains).size) return R(371, "trust_domain_inflation");
  return null;
}

// 372 — profile floor: >=1 bounded-time authority (TSA); required publication present; distinct-domain
// threshold met; required-confirmed satisfied. OTS-only (no TSA) fails here. Pending Quorum → 372.
export function checkProfileFloor(ctx) {
  const spec = ctx.profileSpec;
  if (!spec) return R(372, "unknown_profile");

  const boundedAuthorities = ctx.tsaAnchor ? 1 : 0;
  if (boundedAuthorities < spec.min_bounded_authorities) return R(372, "no_bounded_time_authority");

  if (spec.require_publication) {
    if (!ctx.otsAnchor) return R(372, "required_publication_absent");
    if (ctx.dedupedDomains.length < spec.threshold)
      return R(372, "distinct_domain_threshold_unmet");
    if (spec.required_confirmed_publication && ctx.computedFinality !== "confirmed") {
      return R(372, "required_confirmed_publication_absent"); // pending Quorum is an honest floor miss
    }
  }
  return null;
}
