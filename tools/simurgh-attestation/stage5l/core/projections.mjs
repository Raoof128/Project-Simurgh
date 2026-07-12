// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q raw 381 (audit-only) projections. Recomputes the censuses + projection_root and
// compares to the stored bundle.projections. The PUBLIC tier never runs this (it never certifies
// projections). Pure recompute over the already-verified ctx.
import { R } from "./result.mjs";
import { artifactDigest, releaseSlotId } from "./derive.mjs";

// Derived computed-state label (a projection of already-verified facts, not a new decision).
export function computedState(ctx) {
  if (ctx.profileSpec?.require_publication) {
    return ctx.computedFinality === "confirmed" ? "vtc_quorum_confirmed" : "vtc_quorum_pending";
  }
  return "vtc_core_valid";
}
export function rungFor(state) {
  return state === "vtc_quorum_confirmed" ? "externally_anchored" : "challenge_bound";
}

export function computeProjections(ctx) {
  const state = computedState(ctx);
  const surfaceSlots = (ctx.bundle.declared_release_surface ?? []).map((s) =>
    releaseSlotId(s.endpoint_id, s.release_ordinal)
  );
  const releasedSlots = (ctx.bundle.declared_releases ?? []).map((r) =>
    releaseSlotId(r.endpoint_id, r.release_ordinal)
  );
  const proj = {
    state_census: { computed_state: state, rung: rungFor(state) },
    quorum_census: {
      deduped_domain_count: ctx.dedupedDomains.length,
      threshold: ctx.profileSpec?.threshold ?? null,
      computed_finality: ctx.computedFinality ?? null,
    },
    release_census: {
      surface_count: surfaceSlots.length,
      released_count: releasedSlots.length,
      bijection: [...surfaceSlots].sort().join(",") === [...releasedSlots].sort().join(","),
    },
    anchor_census: {
      registry: [...(ctx.bundle.trust_domain_registry ?? [])].sort(),
      typed_result_domains: [...new Set(ctx.anchors.map((a) => a.trust_domain))].sort(),
    },
  };
  return { ...proj, projection_root: artifactDigest(proj) };
}

export function checkProjections(ctx) {
  const recomputed = computeProjections(ctx);
  const stored = ctx.bundle.projections;
  if (!stored || stored.projection_root !== recomputed.projection_root) {
    return R(381, "projection_mismatch");
  }
  return null;
}
