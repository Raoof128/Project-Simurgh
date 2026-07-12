// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — Lane C: attach an external anchor (public-witness OR sigstore-keyless) to a pack, bound to
// the universe_commitment_digest. Bespoke (NOT a 5J copy): after attaching, it RE-VERIFIES the pack —
// which recomputes verification_context_digest internally — so the anchor never silently breaks raw 0.
// The ONLINE verification (ots verify / cosign) is a separate operator step (verify-witness / cosign).
import { verifyVuc } from "./adapter.mjs";

export function attachAnchor(pack, anchor) {
  const { bundle, cfg } = pack;
  const subject = bundle.universe_commitment.universe_commitment_digest;
  if (anchor.anchored_digest !== subject)
    throw new Error("anchor.anchored_digest must equal universe_commitment_digest");
  const nextCfg = { ...cfg, anchor_evidence: anchor };
  // Re-verify (recomputes verification_context_digest); the anchor is metadata, must not disturb raw 0.
  const pub = verifyVuc(bundle, nextCfg, { tier: "public" }).raw;
  const aud = verifyVuc(bundle, nextCfg, { tier: "audit" }).raw;
  if (pub !== 0 || aud !== 0)
    throw new Error(`anchor attachment broke verification: pub=${pub} aud=${aud}`);
  return { bundle, cfg: nextCfg, anchored_digest: subject };
}
