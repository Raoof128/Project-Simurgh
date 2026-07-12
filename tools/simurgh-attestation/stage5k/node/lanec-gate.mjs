// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — Lane C campaign gate. A campaign is `completed` ONLY if a pack is present AND verifies raw 0
// under a verifier key distinct from ours (VFC distinct_key_only — identifier separation, not a
// non-possession claim) AND ordering is verified_immediate. A failing pack can be SEALED as an outcome
// (the adversarial gerrymandering demo's 357/358/354 trophy) but is never `completed`.
import { verifyVuc, makeAdapterFacts } from "./adapter.mjs";
import { strongestRung, publicWitness } from "../core/independence.mjs";

export function evaluateCampaign(campaign, ourVerifierFingerprint, anchorFacts = {}) {
  if (!campaign || campaign.status === "pending") return { status: "pending" };
  if (campaign.status !== "completed") return { status: "rejected", reason: "unknown_status" };
  if (!campaign.pack) return { status: "rejected", reason: "completed_without_pack" };

  const { bundle, cfg } = campaign.pack;
  const raw = verifyVuc(bundle, cfg, { tier: "audit" }).raw;
  if (raw !== 0) return { status: "rejected", reason: "pack_does_not_verify", raw };

  const facts = makeAdapterFacts(bundle, cfg);
  if (facts.orderingState !== "verified_immediate")
    return { status: "rejected", reason: "ordering_not_verified_immediate" };
  if (cfg.verifier_key_fingerprint === ourVerifierFingerprint)
    return { status: "rejected", reason: "verifier_not_distinct" };

  return {
    status: "completed",
    raw: 0,
    ordering_state: facts.orderingState,
    independence: strongestRung(bundle, cfg, anchorFacts),
    public_witness: publicWitness(bundle, cfg, anchorFacts),
  };
}

// A sealed adversarial demonstration (the live gerrymandering producer, Lane C-adv). The outcome is
// recorded honestly: a caught narrowing (357/358) or post-signal commit (354) is a verifier TROPHY, not
// a completed campaign; raw 0 means the (possibly narrow) universe is on the record and the system works.
export function sealAdversarialOutcome(raw) {
  if (raw === 0) return { sealed: "system_works_universe_on_record" };
  if (raw === 357) return { sealed: "shrinking_caught_trophy" };
  if (raw === 358) return { sealed: "phantom_caught_trophy" };
  if (raw === 354) return { sealed: "post_signal_commit_caught_trophy" };
  return { sealed: "other", raw };
}
