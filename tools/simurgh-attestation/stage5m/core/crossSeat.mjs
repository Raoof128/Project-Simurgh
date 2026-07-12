// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — 391 exact cross-seat binding + 392 counterfeit ecology (over INJECTED facts). Two declared
// representations resolving to one commitment: TSA imprint + OTS leaf bind D directly (the frozen-5L OTS
// contract requires ots_leaf == commitment); Rekor binds sha256(hex(D)). Distinctness (392) is over the
// verifier-PINNED ecology classes among present seats — a duplicate is aliasing (No Counterfeit Ecology).
import { R } from "./result.mjs";

export function checkCrossSeat(facts) {
  // TSA + OTS always present (the two frozen anchors); both bind the commitment directly.
  if (facts.anchor_decoded !== facts.commitment) return R(391, "anchor_not_commitment");
  if (facts.tsa_imprint !== facts.commitment) return R(391, "tsa_imprint_disagrees");
  if (facts.ots_leaf !== facts.commitment) return R(391, "ots_leaf_disagrees");
  if (facts.seat_present) {
    if (facts.rekor_artifact_hash !== facts.anchor_sha256)
      return R(391, "rekor_artifact_disagrees");
  }
  return null;
}

export function checkDistinctEcologies(facts) {
  const c = facts.present_valid_ecology_classes ?? [];
  if (new Set(c).size < c.length) return R(392, "counterfeit_ecology");
  return null;
}
