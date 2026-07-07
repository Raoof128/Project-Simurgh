// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V respondent census — Same Rules for the Defence (spec §2 rail, §6).
// Motto: AnthropicSafe First, then ReviewerSafe.
// The defence is checked by the OPERATOR'S OWN census verifier (stage4t verifyCensus),
// with raw codes remapped into the VDP block. No respondent-only census logic exists.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { buildEvidenceManifest, verifyCensus } from "../../stage4t/core/censusCore.mjs";

export const buildRespondentCensus = buildEvidenceManifest;

export const respondentArtifactsIndex = (cc) =>
  Object.fromEntries((cc.respondent_evidence_artifacts ?? []).map((a) => [recordDigest(a), a]));

// Every evidence_digest a contest / anchor / filed_at_beat relies on.
export const referencedDigests = (cc) => {
  const all = [
    ...(cc.contests ?? []),
    ...(cc.anchor_contest ? [cc.anchor_contest] : []),
    ...(cc.filed_at_beat ? [cc.filed_at_beat] : []),
  ];
  return new Set(all.map((c) => c.evidence_digest).filter((d) => typeof d === "string"));
};

const REMAP = Object.freeze({ 138: 155, 139: 156, 140: 157, 145: 158 });
const REASON = Object.freeze({
  155: "vdp_respondent_census_item_mismatch",
  156: "vdp_respondent_census_omits_evidence",
  157: "vdp_respondent_census_root_mismatch",
  158: "vdp_respondent_census_epoch_mismatch",
});

export function verifyRespondentCensus(cc, capsuleEpoch) {
  const res = verifyCensus(
    { evidence_manifest: cc.respondent_census, epoch: capsuleEpoch },
    respondentArtifactsIndex(cc)
  );
  if (res) {
    const raw = REMAP[res.raw];
    return { raw, reason: REASON[raw], detail: res.detail };
  }
  // P0 #3 — Same Rules: a contest may only cite evidence inside its OWN sealed census.
  const listed = new Set((cc.respondent_census?.items ?? []).map((i) => i.digest));
  for (const d of referencedDigests(cc))
    if (!listed.has(d))
      return { raw: 156, reason: "vdp_respondent_census_omits_evidence", detail: { referenced: d } };
  return null;
}
