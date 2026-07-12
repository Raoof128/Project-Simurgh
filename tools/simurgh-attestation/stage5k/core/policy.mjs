// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 362 policy / reserved slots. A non-null reserved artifact slot, or a release-profile
// violation (non-release composition, leaf_count < 2, or a fixture order ticket under release).
import { R } from "./result.mjs";
import { VUC_RESERVED_ARTIFACT_SLOTS, POLICY_PROFILES } from "../constants.mjs";

export function checkReservedSlots(ctx) {
  const { bundle, cfg } = ctx;
  for (const slot of VUC_RESERVED_ARTIFACT_SLOTS)
    if (bundle[slot] !== null) return R(362, "reserved_slot_activated", { slot });

  const policy = cfg.policy ?? POLICY_PROFILES.test;
  const isRelease = policy.profile_id === POLICY_PROFILES.release.profile_id;
  if (isRelease) {
    if (bundle.composition_profile !== "vpc_and_vrc")
      return R(362, "non_release_composition_profile");
    if (bundle.universe_commitment.leaf_count < POLICY_PROFILES.release.min_leaves)
      return R(362, "leaf_count_below_release_min");
    if (bundle.ordering_anchor?.anchor_type === "fixture_sequenced_order_ticket")
      return R(362, "fixture_order_ticket_forbidden_under_release");
  }
  return null;
}
