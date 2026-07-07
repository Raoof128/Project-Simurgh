// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC field binding + suppression law (spec §5, §6). Motto: AnthropicSafe First, then ReviewerSafe.
//
// No Hearsay cuts both ways:
//   141 field_unbacked                    evidence_backed section with no resolvable evidence digest (fabrication)
//   142 field_recompute_mismatch          registry recompute != projected value (incl. chain verdict)
//   143 not_derivable_unjustified         SUPPRESSION: a derivable section hidden while its evidence is in the census
//   144 requires_human_input_unjustified  SUPPRESSION: a derivable section laundered behind a human-input marker
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { PARTITIONS, PARTITION_RECOMPUTE_KIND } from "../constants.mjs";

// Maps a recompute kind to the census item.kind that supplies its evidence.
export const KIND_EVIDENCE_SOURCE = Object.freeze({
  stage4s_chain_verdict: "stage4s_chain_bundle",
  kernel_block_record: "kernel_decision_records",
  epoch_range: "stage4s_chain_bundle",
  participant_count: "stage4s_chain_bundle",
  consent_manifest_scope: "stage4o_consent_manifests",
  stage4u_asr: "stage4u_attestation_ref",
  stage4n_beat_index: "stage4n_temporal_anchor",
});

// One pure recompute function per kind. stage4s_chain_verdict defers to ctx.chainVerdict
// (audit tier: rerun the 4S verifier; public tier: read the recorded verdict).
export const RECOMPUTE_REGISTRY = Object.freeze({
  stage4s_chain_verdict: (artifact, ctx) => ctx.chainVerdict(artifact),
  kernel_block_record: (artifact) =>
    (artifact.decisions ?? []).filter((d) => d.decision === "blocked").length,
  epoch_range: (artifact) => artifact.range,
  participant_count: (artifact) => (artifact.participants ?? []).length,
  consent_manifest_scope: (artifact) => artifact.scope,
  stage4u_asr: (artifact) => artifact.attack_success_rate,
  stage4n_beat_index: (artifact) => artifact.beat_index,
});

const eq = (a, b) => canonicalJson(a) === canonicalJson(b);

// Validate every evidence_backed projected section (and the capsule-level anchored
// knowability field, if present) against the sealed evidence.
export function verifyProjection(capsule, artifactsByDigest, ctx) {
  const checkField = (field) => {
    const artifact = artifactsByDigest[field.evidence_digest];
    if (artifact === undefined)
      return { raw: 141, reason: "field_unbacked", detail: { section_id: field.section_id } };
    const fn = RECOMPUTE_REGISTRY[field.recompute_kind];
    const recomputed = fn(artifact, ctx);
    if (!eq(recomputed, field.value))
      return {
        raw: 142,
        reason: "field_recompute_mismatch",
        detail: { section_id: field.section_id, recompute_kind: field.recompute_kind },
      };
    return null;
  };

  for (const ps of capsule.projected_sections ?? []) {
    if (ps.class !== "evidence_backed") continue;
    const r = checkField(ps);
    if (r) return r;
  }
  // Invention 4 — anchored knowability: a capsule-level evidence_backed field,
  // not a template section (so it is not subject to 137).
  if (capsule.evidence_anchored_at_beat) {
    const r = checkField({
      section_id: "evidence_anchored_at_beat",
      ...capsule.evidence_anchored_at_beat,
    });
    if (r) return r;
  }
  return null;
}

// Suppression: the partition is normative. If the partition classes a section
// evidence_backed, and the capsule downgrades it while the sealed census still
// holds an artifact of that section's evidence kind, that is hiding derivable
// evidence — a No Hearsay failure.
export function verifySuppression(capsule, partitions, kindOf) {
  const parts = partitions ?? PARTITIONS;
  const kinds = kindOf ?? PARTITION_RECOMPUTE_KIND;
  const presentKinds = new Set((capsule.evidence_manifest?.items ?? []).map((i) => i.kind));
  const projectedByKey = new Map(
    (capsule.projected_sections ?? []).map((p) => [`${p.regime}/${p.section_id}`, p])
  );

  for (const regime of Object.keys(parts)) {
    for (const [sectionId, cls] of Object.entries(parts[regime])) {
      if (cls !== "evidence_backed") continue;
      const projected = projectedByKey.get(`${regime}/${sectionId}`);
      if (!projected) continue; // absence-of-projection is a schema/137 concern, not suppression
      const k = kinds[regime][sectionId];
      const sourceKind = KIND_EVIDENCE_SOURCE[k];
      if (!presentKinds.has(sourceKind)) continue; // honest absence: evidence not in census
      if (projected.class === "not_derivable")
        return {
          raw: 143,
          reason: "not_derivable_unjustified",
          detail: { regime, section_id: sectionId, source_kind: sourceKind },
        };
      if (projected.class === "requires_human_input")
        return {
          raw: 144,
          reason: "requires_human_input_unjustified",
          detail: { regime, section_id: sectionId, source_kind: sourceKind },
        };
    }
  }
  return null;
}
