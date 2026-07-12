// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC Lane C independence rung (reuses the VFC lattice: distinct_key_only → challenge_bound
// → externally_anchored). The pure part is STRUCTURAL: the strongest rung an independent pack can claim
// given the anchor evidence it carries and the digest binding. The ONLINE Fulcio/Rekor verification is
// the adapter/operator's job and is injected as `facts.anchorVerified` (the B11 pattern) — Sigstore is
// an external service, so it is NEVER part of the offline raw-0 recompute; independence is a Lane-C
// property, not a verdict code.
import { contestLayerRoot } from "./roots.mjs";
import { RUNG } from "../constants.mjs";

// A pack carries `anchor_evidence` (optional) at cfg.anchor_evidence:
//   { kind: "sigstore-keyless", anchored_digest, identity, bundle_digest }
// `anchored_digest` MUST equal the pack's contest_layer_root (binds the anchor to THIS evidence).
export function strongestRung(
  bundle,
  cfg,
  { anchorVerified = false, challengeVerified = false } = {}
) {
  const anchor = cfg?.anchor_evidence;
  if (anchor && anchor.kind === "sigstore-keyless") {
    const bound = anchor.anchored_digest === contestLayerRoot(bundle);
    if (bound && anchorVerified) return "externally_anchored";
  }
  if (challengeVerified) return "challenge_bound";
  return "distinct_key_only";
}

// True iff the pack's anchor evidence is STRUCTURALLY well-formed and bound to this evidence (the part
// we can check offline). Does NOT prove the Sigstore cert is real / in Rekor — that is anchorVerified.
export function anchorBindingValid(bundle, cfg) {
  const a = cfg?.anchor_evidence;
  if (!a) return { ok: false, reason: "no_anchor_evidence" };
  if (a.kind !== "sigstore-keyless") return { ok: false, reason: "unknown_anchor_kind" };
  if (typeof a.identity !== "string" || !a.identity)
    return { ok: false, reason: "anchor_identity_missing" };
  if (a.anchored_digest !== contestLayerRoot(bundle))
    return { ok: false, reason: "anchor_not_bound_to_pack" };
  return { ok: true };
}

export function rungAtLeast(rung, floor) {
  return RUNG.index(rung) >= RUNG.index(floor);
}
