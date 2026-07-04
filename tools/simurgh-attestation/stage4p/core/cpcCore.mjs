// SPDX-License-Identifier: AGPL-3.0-or-later
// CPC signal construction + emission verification — raw 79 (4P spec §6.4–§6.6, §9).
// The 4N anchor is a PUBLIC temporal domain separator, not a secret salt.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { windowedEvidenceCommitment, custodyClassDigest } from "./digest.mjs";
import { validateCpcSignal } from "./schemaCore.mjs";
import { SCHEMAS, ENTROPY_BITS_BY_KIND, ENTROPY_FLOOR_BITS } from "../constants.mjs";

export function buildCpcSignal(input) {
  const bits = ENTROPY_BITS_BY_KIND[input.evidence_kind];
  if (bits === undefined) throw new Error(`unknown_evidence_kind: ${input.evidence_kind}`);
  if (bits < ENTROPY_FLOOR_BITS) {
    return {
      schema: SCHEMAS.CPC_SIGNAL,
      signal_mode: "degraded_non_matchable",
      coarse_failure_class: input.failure_class,
      stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
      entropy_floor_bits: ENTROPY_FLOOR_BITS,
      observed_entropy_bits: 0,
      public_linkability: "none",
    };
  }
  // Window-bind the raw evidence BEFORE publishing; the raw observed_evidence_digest
  // never leaves this function (MF1).
  const windowed_evidence_commitment = windowedEvidenceCommitment({
    stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
    observed_evidence_digest: input.observed_evidence_digest,
  });
  return {
    schema: SCHEMAS.CPC_SIGNAL,
    signal_mode: "matchable",
    failure_class: input.failure_class,
    stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
    evidence_kind: input.evidence_kind,
    windowed_evidence_commitment,
    custody_class_digest: custodyClassDigest({
      stage4n_window_anchor_digest: input.stage4n_window_anchor_digest,
      failure_class: input.failure_class,
      evidence_kind: input.evidence_kind,
      windowed_evidence_commitment,
      entropy_floor_bits: ENTROPY_FLOOR_BITS,
      disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
    }),
    entropy_floor_bits: ENTROPY_FLOOR_BITS,
    disclosure_budget_max_signals_per_window: input.disclosure_budget_max_signals_per_window,
    public_linkability: "bounded",
  };
}

export function verifyCpcEmission({ signals, declared_cap, anchor_digests }) {
  const anchors = new Set(anchor_digests);
  const matchablePerAnchor = new Map();
  for (const sig of signals) {
    const v = validateCpcSignal(sig);
    if (!v.ok) return v;
    if (!anchors.has(sig.stage4n_window_anchor_digest))
      return { ok: false, raw: 79, reason: "window_anchor_not_in_feed" };
    if (sig.signal_mode !== "matchable") continue;
    if (ENTROPY_BITS_BY_KIND[sig.evidence_kind] < sig.entropy_floor_bits)
      return { ok: false, raw: 79, reason: "below_floor_digest_emitted" };
    // A signal's advertised per-window budget must equal the operator's declared cap.
    // The budget is baked into the class digest, so a self-consistent signal can advertise
    // an inflated cap that passes recompute; enforce agreement explicitly.
    if (sig.disclosure_budget_max_signals_per_window !== declared_cap)
      return { ok: false, raw: 79, reason: "declared_budget_mismatch" };
    // Verifier-grade recompute from the PUBLISHED window-bound commitment (MF1). No
    // raw evidence needed; a digest that does not recompute is a forged match token.
    const recomputed = custodyClassDigest({
      stage4n_window_anchor_digest: sig.stage4n_window_anchor_digest,
      failure_class: sig.failure_class,
      evidence_kind: sig.evidence_kind,
      windowed_evidence_commitment: sig.windowed_evidence_commitment,
      entropy_floor_bits: sig.entropy_floor_bits,
      disclosure_budget_max_signals_per_window: sig.disclosure_budget_max_signals_per_window,
    });
    if (recomputed !== sig.custody_class_digest)
      return { ok: false, raw: 79, reason: "custody_class_recompute_mismatch" };
    const n = (matchablePerAnchor.get(sig.stage4n_window_anchor_digest) ?? 0) + 1;
    if (n > declared_cap) return { ok: false, raw: 79, reason: "disclosure_budget_exceeded" };
    matchablePerAnchor.set(sig.stage4n_window_anchor_digest, n);
  }
  return { ok: true };
}
