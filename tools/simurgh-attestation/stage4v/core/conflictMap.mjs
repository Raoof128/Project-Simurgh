// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V conflict map — five-status derivation, geometry over intent (spec §3, §4, §4a).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Registry-authority rail: recompute comes ONLY from the stage4t shared registry.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RECOMPUTE_REGISTRY, KIND_EVIDENCE_SOURCE } from "../../stage4t/core/projectionCore.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";
import { VDP_CONFLICT_MAP_SCHEMA, ANCHOR_KEY } from "../constants.mjs";
import { contestTuples, keyString } from "./bindingCore.mjs";
import { respondentArtifactsIndex } from "./contestCensus.mjs";

const eq = (a, b) => canonicalJson(a) === canonicalJson(b);
const ABSENCE = new Set(["not_derivable", "requires_human_input"]);

// Frozen table (spec §3): verb x class x recompute outcome -> status.
export function deriveSectionStatus({ contest, cls, operatorValue, artifacts, ctx }) {
  if (cls === undefined) return { status: "DISPUTE_FAILED", subreason: "section_not_contestable" };
  if (contest.verb === "dispute_as_judgment") return { status: "DISPUTE_RECORDED" };
  if (contest.verb === "agree" && ABSENCE.has(cls))
    return { status: "DISPUTE_FAILED", subreason: "section_not_contestable" };
  // recomputation verbs (agree / dispute_by_recomputation): recompute the respondent's
  // own evidence through the shared registry.
  const artifact = artifacts[contest.evidence_digest];
  const fn = artifact === undefined ? undefined : RECOMPUTE_REGISTRY[contest.recompute_kind];
  // P1 #7 — executable KIND_EVIDENCE_SOURCE rail: the cited artifact's kind must be
  // the source kind the recompute kind expects (a chain verdict may not be recomputed
  // from a kernel record). A kind/artifact mismatch is a failed dispute, not a valid one.
  const expectedKind = KIND_EVIDENCE_SOURCE[contest.recompute_kind];
  const kindOk =
    artifact !== undefined && expectedKind !== undefined && artifact.kind === expectedKind;
  if (fn === undefined || !kindOk)
    return { status: "DISPUTE_FAILED", subreason: "recompute_failed" };
  const recomputed = fn(artifact, ctx);

  // agree = "my own recompute equals the operator's stated value". Anything else is a
  // failed submission (an agreement that disagrees). Only reachable on evidence_backed.
  if (contest.verb === "agree")
    return eq(recomputed, operatorValue)
      ? { status: "AGREED", respondent_value: recomputed }
      : { status: "DISPUTE_FAILED", subreason: "recompute_failed" };

  // dispute_by_recomputation: the respondent's evidence must self-consistently recompute
  // their OWN claimed value; then geometry (vs operator) decides the outcome.
  if (!eq(recomputed, contest.claimed_value))
    return { status: "DISPUTE_FAILED", subreason: "recompute_failed" };
  if (ABSENCE.has(cls))
    return { status: "ABSENCE_REBUTTED", respondent_value: contest.claimed_value };
  return eq(contest.claimed_value, operatorValue)
    ? { status: "AGREED", respondent_value: contest.claimed_value }
    : { status: "CONFLICT_PROVEN", respondent_value: contest.claimed_value };
}

export function deriveConflictMap(capsuleBundle, cc, ctx) {
  const capsule = capsuleBundle.content;
  const artifacts = respondentArtifactsIndex(cc);
  const operatorByKey = new Map(
    (capsule.projected_sections ?? []).map((p) => [keyString(p), p])
  );
  const sections = (cc.contests ?? []).map((contest) => {
    const key = keyString(contest);
    const cls = PARTITIONS[contest.regime]?.[contest.section_id];
    const op = operatorByKey.get(key);
    const derived = deriveSectionStatus({
      contest,
      cls,
      operatorValue: op?.value,
      artifacts,
      ctx,
    });
    return {
      key,
      verb: contest.verb,
      operator_class: cls ?? null,
      ...(op?.value !== undefined ? { operator_value: op.value } : {}),
      ...derived,
    };
  });

  // Anchor contest (spec §4a): evidence_backed semantics against the capsule anchor.
  let anchor_status;
  if (cc.anchor_contest) {
    anchor_status = deriveSectionStatus({
      contest: cc.anchor_contest,
      cls: "evidence_backed",
      operatorValue: capsule.evidence_anchored_at_beat?.value,
      artifacts,
      ctx,
    });
  }

  const contested = new Set(contestTuples(cc).map(keyString));
  const uncontested_sections = Object.keys(PARTITIONS)
    .flatMap((r) => Object.keys(PARTITIONS[r]).map((s) => `${r}/${s}`))
    .filter((k) => !contested.has(k))
    .sort();

  const partition_rescore_signals = sections
    .filter((s) => s.status === "ABSENCE_REBUTTED")
    .map((s) => ({ key: s.key, note: "review_signal_not_automatic_rewrite" }));

  return {
    schema: VDP_CONFLICT_MAP_SCHEMA,
    binding: cc.binding,
    respondent_role: cc.respondent_role,
    sections,
    ...(anchor_status ? { anchor_status: { key: ANCHOR_KEY, ...anchor_status } } : {}),
    uncontested_sections,
    partition_rescore_signals,
  };
}
