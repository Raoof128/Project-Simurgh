// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — VSC: Verifiable System Card (spec §3, plan Task 15). PAYS the three-stage
// IOU `transparency_report_profile_deferred`. Motto: AnthropicSafe First, then ReviewerSafe.
//
// A system-card-shaped document whose every safety NUMBER is a 4W-schema `slot_bound` span
// bound to a verified artifact digest and recomputed from that artifact — while the narrative
// prose stays typed as unverified_prose and is scanned (reused 4W scanLeakage) so no untyped
// number is smuggled into it. ZERO new raw codes and zero new verification geometry; the
// per-artifact recompute registry is the only new glue (the "spine" is heterogeneous, so the
// 4W recompute HARNESS is reused over a VSC-specific sealed index rather than one capsule).
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";
import { SPAN_TYPES } from "../../stage4w/constants.mjs";

export const VSC_SCHEMA = "simurgh.vsc.v1";

// recompute_kind → fn(artifact) → the safety number. Extend per artifact species across the
// spine (4T/4U/4X/4Y/4Z); here the 4Z WFM aggregates are wired as the reference species.
export const VSC_RECOMPUTE_KINDS = Object.freeze({
  vwa_flag_total: (wfm) => wfm.aggregates.flag_total,
  vwa_n_flagged_cells: (wfm) => wfm.aggregates.n_flagged_cells,
  vwa_n_cells: (wfm) => wfm.aggregates.n_cells,
});

// renderVsc({ narrative, bindings }) — bindings: [{ span_id, recompute_kind, artifact }].
// Each becomes a slot_bound span carrying evidence_digest + the recomputed claimed_value.
export function renderVsc({ narrative, bindings }) {
  const spans = bindings.map((b) => {
    const fn = VSC_RECOMPUTE_KINDS[b.recompute_kind];
    if (!fn) throw new Error("unknown_recompute_kind:" + b.recompute_kind);
    return {
      span_id: b.span_id,
      type: "slot_bound",
      evidence_digest: recordDigest(b.artifact),
      recompute_kind: b.recompute_kind,
      claimed_value: fn(b.artifact),
    };
  });
  return { schema: VSC_SCHEMA, narrative: narrative ?? "", spans };
}

// verifyVsc(vsc, sealedArtifacts) → { ok, errors }. Each slot_bound span must resolve to a
// sealed artifact whose recompute equals the claimed_value; the narrative must smuggle no
// untyped number (reused 4W scanLeakage over the prose). Numbers live in spans, not prose.
export function verifyVsc(vsc, sealedArtifacts) {
  const errors = [];
  if (vsc?.schema !== VSC_SCHEMA) errors.push({ error: "bad_schema" });
  if (!SPAN_TYPES.includes("slot_bound")) errors.push({ error: "span_type_missing" }); // reuse guard

  const index = {};
  for (const art of sealedArtifacts ?? []) index[recordDigest(art)] = art;

  for (const s of vsc?.spans ?? []) {
    if (s.type !== "slot_bound") {
      errors.push({ span_id: s.span_id, error: "not_slot_bound" });
      continue;
    }
    const art = index[s.evidence_digest];
    const fn = VSC_RECOMPUTE_KINDS[s.recompute_kind];
    if (art === undefined || fn === undefined) {
      errors.push({ span_id: s.span_id, error: "recompute_unavailable" });
      continue;
    }
    if (fn(art) !== s.claimed_value)
      errors.push({ span_id: s.span_id, error: "recompute_mismatch" });
  }

  // No Smuggled Claim (reused 4W gate): the prose narrative must carry no untyped number.
  const leak = scanLeakage(vsc?.narrative ?? "", [], []);
  if (leak.length) errors.push({ error: "smuggled_claim_in_prose", hits: leak.length });

  return { ok: errors.length === 0, errors };
}
