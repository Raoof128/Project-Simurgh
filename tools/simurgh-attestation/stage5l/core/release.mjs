// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q release census (377/378) + anchor-omission census (379). 376 already verified each
// PRESENT child recomputes from this ceremony's root; here we verify the SET is a bijection with the
// committed declared_release_surface (No Temporal Release Bypass), and every committed trust-domain has a
// typed result (bounded to the committed registry).
import { R } from "./result.mjs";
import { releaseSlotId } from "./derive.mjs";

// 377 — a committed surface endpoint with NO release (a required release is missing → bypass).
export function checkReleaseBinding(ctx) {
  const surface = ctx.bundle.declared_release_surface ?? [];
  const releasedSlots = new Set(
    (ctx.bundle.declared_releases ?? []).map((r) => releaseSlotId(r.endpoint_id, r.release_ordinal))
  );
  for (const s of surface) {
    const slot = releaseSlotId(s.endpoint_id, s.release_ordinal);
    if (!releasedSlots.has(slot))
      return R(377, "surface_entry_not_released", { endpoint: s.endpoint_id });
  }
  return null;
}

// 378 — an EXTRA release outside the committed surface, or a count mismatch (set-level census).
export function checkReleaseCensus(ctx) {
  const surfaceSlots = new Set(
    (ctx.bundle.declared_release_surface ?? []).map((s) =>
      releaseSlotId(s.endpoint_id, s.release_ordinal)
    )
  );
  const releases = ctx.bundle.declared_releases ?? [];
  for (const r of releases) {
    const slot = releaseSlotId(r.endpoint_id, r.release_ordinal);
    if (!surfaceSlots.has(slot))
      return R(378, "release_outside_surface", { endpoint: r.endpoint_id });
  }
  if (releases.length !== surfaceSlots.size) return R(378, "release_census_count_mismatch");
  return null;
}

// 379 — every member of the COMMITTED trust-domain registry has a typed result (an admitted anchor of that
// domain). Silence is failure, not disappearance — bounded to the committed registry, not unknown notaries.
export function checkAnchorOmission(ctx) {
  const anchorDomains = new Set(ctx.anchors.map((a) => a.trust_domain));
  for (const d of ctx.bundle.trust_domain_registry ?? []) {
    if (!anchorDomains.has(d)) return R(379, "committed_domain_no_typed_result", { domain: d });
  }
  return null;
}
