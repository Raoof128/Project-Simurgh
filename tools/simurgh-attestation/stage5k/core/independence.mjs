// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC Lane C independence rung (reuses the VFC lattice: distinct_key_only → challenge_bound
// → externally_anchored). The pure part is STRUCTURAL: the strongest rung a pack can claim given the
// anchor evidence it carries and the digest binding to the universe_commitment_digest. The ONLINE
// Fulcio/Rekor/Bitcoin verification is the operator's job, injected as facts (B11) — never part of the
// offline raw-0 recompute. Independence is a Lane-C property, not a verdict code.
import { RUNG } from "../constants.mjs";

const anchorSubject = (bundle) => bundle.universe_commitment.universe_commitment_digest;

export function strongestRung(
  bundle,
  cfg,
  { anchorVerified = false, challengeVerified = false } = {}
) {
  const anchor = cfg?.anchor_evidence;
  if (anchor && anchor.kind === "sigstore-keyless") {
    const bound = anchor.anchored_digest === anchorSubject(bundle);
    if (bound && anchorVerified) return "externally_anchored";
  }
  if (challengeVerified) return "challenge_bound";
  return "distinct_key_only";
}

export function anchorBindingValid(bundle, cfg) {
  const a = cfg?.anchor_evidence;
  if (!a) return { ok: false, reason: "no_anchor_evidence" };
  if (a.kind !== "sigstore-keyless") return { ok: false, reason: "unknown_anchor_kind" };
  if (typeof a.identity !== "string" || !a.identity)
    return { ok: false, reason: "anchor_identity_missing" };
  if (a.anchored_digest !== anchorSubject(bundle))
    return { ok: false, reason: "anchor_not_bound_to_pack" };
  return { ok: true };
}

export function rungAtLeast(rung, floor) {
  return RUNG.index(rung) >= RUNG.index(floor);
}

// DE-IDENTIFIED public-transparency-log witness (OpenTimestamps / Bitcoin, or a pseudonymous Rekor
// entry) over the universe_commitment_digest — proves public immutable witnessing WITHOUT revealing who.
// Orthogonal to the identity lattice; never lifts the rung above distinct_key_only.
const WITNESS_LOGS = new Set(["opentimestamps", "rekor"]);

export function publicWitnessBindingValid(bundle, cfg) {
  const w = cfg?.anchor_evidence;
  if (!w || w.kind !== "public-witness") return { ok: false, reason: "no_public_witness" };
  if (!WITNESS_LOGS.has(w.log)) return { ok: false, reason: "unknown_witness_log" };
  if (typeof w.locator !== "string" || !w.locator)
    return { ok: false, reason: "witness_locator_missing" };
  if ("identity" in w) return { ok: false, reason: "witness_must_be_de_identified" };
  if (w.anchored_digest !== anchorSubject(bundle))
    return { ok: false, reason: "witness_not_bound_to_pack" };
  return { ok: true };
}

export function publicWitness(bundle, cfg, { witnessVerified = false } = {}) {
  const b = publicWitnessBindingValid(bundle, cfg);
  if (!b.ok || !witnessVerified) return null;
  return { log: cfg.anchor_evidence.log, verified: true, de_identified: true };
}
