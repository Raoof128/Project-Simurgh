// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — Lane C campaign gate. The REAL independent-party ceremony marks a campaign `completed`
// ONLY if a pack is present AND verifies raw 0 under a verifier key distinct from ours (VFC
// distinct_key_only — identifier separation, NOT a non-possession claim). A pack that fails can be
// SEALED as an outcome (e.g. the adversarial Fable-5 demo's 342 trophy) but is never `completed`.
import { verifyVrc } from "./adapter.mjs";
import { strongestRung, publicWitness } from "../core/independence.mjs";

// `anchorFacts` = { anchorVerified, challengeVerified } — the results of the ONLINE / out-of-band
// checks (cosign verify-blob against Fulcio+Rekor, or a Simurgh challenge round-trip). Absent ⇒
// distinct_key_only. These are injected because Sigstore is an external service (B11) — never part of
// the offline raw-0 recompute.
export function evaluateCampaign(campaign, ourVerifierFingerprint, anchorFacts = {}) {
  if (!campaign || campaign.status === "pending") return { status: "pending" };
  if (campaign.status !== "completed") return { status: "rejected", reason: "unknown_status" };
  if (!campaign.pack) return { status: "rejected", reason: "completed_without_pack" };

  const { bundle, cfg } = campaign.pack;
  const raw = verifyVrc(bundle, cfg, { tier: "audit" }).raw;
  if (raw !== 0) return { status: "rejected", reason: "pack_does_not_verify", raw };

  if (cfg.verifier_key_pin.key_fingerprint === ourVerifierFingerprint) {
    return { status: "rejected", reason: "verifier_not_distinct" };
  }
  return {
    status: "completed",
    raw: 0,
    // Identity lattice (distinct_key_only → challenge_bound → externally_anchored).
    independence: strongestRung(bundle, cfg, anchorFacts),
    // Orthogonal, DE-IDENTIFIED signal — a public transparency-log witness, no identity revealed.
    public_witness: publicWitness(bundle, cfg, anchorFacts),
  };
}

// A sealed adversarial demonstration (Lane-A family): the outcome is recorded honestly, and a 342
// (override caught — trophy) is NOT a completed campaign.
export function sealAdversarialOutcome(raw) {
  if (raw === 0) return { sealed: "system_works" };
  if (raw === 342) return { sealed: "override_caught_trophy" };
  return { sealed: "other", raw };
}
