// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — map delta (spec §3, plan Task 15). Motto: AnthropicSafe First, then
// ReviewerSafe. A pure arithmetic diff of TWO independently verified maps (e.g. a
// withdrawn→revised version pair). Groundwork for narrative_version_diff_deferred — it does
// NOT emit a signed attestation, so it does NOT pay that socket.
import { VDR_REGION_CLASSES } from "../constants.mjs";

// mapDelta(a, b) → { region_class_deltas, shadow_deltas }. b − a, per class + per shadow metric.
export function mapDelta(a, b) {
  const region_class_deltas = {};
  for (const cls of VDR_REGION_CLASSES)
    region_class_deltas[cls] =
      (b.aggregates.bytes_by_class[cls] ?? 0) - (a.aggregates.bytes_by_class[cls] ?? 0);
  const sa = a.aggregates.shadow;
  const sb = b.aggregates.shadow;
  const shadow_deltas = {
    n_caught_regions: sb.n_caught_regions - sa.n_caught_regions,
    a_applicable_variants: sb.a_applicable_variants - sa.a_applicable_variants,
    k_slip_v1: sb.k_slip_v1 - sa.k_slip_v1,
    k_slip_v2: sb.k_slip_v2 - sa.k_slip_v2,
  };
  // No `signature` field is produced — this is a derived metric, not an attestation.
  return { region_class_deltas, shadow_deltas };
}
