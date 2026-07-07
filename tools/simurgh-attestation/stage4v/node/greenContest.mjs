// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V green + mirror contests (spec §7 families 1 and 4).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { recordDigest, sha256Hex, canonicalJson } from "../../stage4m/core/canonical.mjs";
import { buildGreenBundle, EPOCH } from "../../stage4t/node/greenCapsule.mjs";
import { PARTITIONS } from "../../stage4t/constants.mjs";
import { buildRespondentCensus } from "../core/contestCensus.mjs";
import { buildCounterCapsule, resignCounterCapsule } from "../core/counterCapsuleCore.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

export const resignCounterGreen = (cc) => resignCounterCapsule(cc, readKey("vdp-respondent"));

const censusOf = (arts) =>
  buildRespondentCensus({
    epoch: EPOCH,
    items: arts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: EPOCH })),
  });

export function buildGreenContest() {
  const green = buildGreenBundle();
  const chain4 = {
    kind: "stage4s_chain_bundle",
    epoch: EPOCH,
    range: "2026-07-01/2026-07-02",
    participants: ["agent-a", "agent-b", "agent-c", "agent-d"],
    recorded_verdict: 108,
  };
  const kernel2 = {
    kind: "kernel_decision_records",
    epoch: EPOCH,
    decisions: [{ decision: "blocked" }, { decision: "blocked" }],
  };
  const consent = { kind: "stage4o_consent_manifests", epoch: EPOCH, scope: ["mail.read"] };
  const anchor40 = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 40 };
  const anchor43 = { kind: "stage4n_temporal_anchor", epoch: EPOCH, beat_index: 43 };
  const arts = [chain4, kernel2, consent, anchor40, anchor43];
  const d = (a) => recordDigest(a);

  const contests = [
    // AGREED: remedial_actions (operator 2) — own kernel recomputes 2.
    {
      regime: "art73_high_risk_draft",
      section_id: "remedial_actions",
      verb: "dispute_by_recomputation",
      claimed_value: 2,
      recompute_kind: "kernel_block_record",
      evidence_digest: d(kernel2),
    },
    // CONFLICT_PROVEN: users_affected (operator 2) — own chain shows 4 participants.
    {
      regime: "art73_high_risk_draft",
      section_id: "users_affected",
      verb: "dispute_by_recomputation",
      claimed_value: 4,
      recompute_kind: "participant_count",
      evidence_digest: d(chain4),
    },
    // ABSENCE_REBUTTED: gpai evidence_available is not_derivable — respondent derives it.
    {
      regime: "gpai_art55",
      section_id: "evidence_available",
      verb: "dispute_by_recomputation",
      claimed_value: ["mail.read"],
      recompute_kind: "consent_manifest_scope",
      evidence_digest: d(consent),
    },
    // DISPUTE_RECORDED: judgment against root_cause_analysis, prose by digest.
    {
      regime: "gpai_art55",
      section_id: "root_cause_analysis",
      verb: "dispute_as_judgment",
      judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "vdp-green-judgment" })),
    },
    // DISPUTE_FAILED{recompute_failed}: claims 5 blocks; own evidence recomputes 2.
    {
      regime: "gpai_art55",
      section_id: "serious_incident_response",
      verb: "dispute_by_recomputation",
      claimed_value: 5,
      recompute_kind: "kernel_block_record",
      evidence_digest: d(kernel2),
    },
  ];

  const counterCapsule = buildCounterCapsule({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    contests,
    respondentRole: "deployer",
    respondentCensus: censusOf(arts),
    respondentArtifacts: arts,
    // Anchor contest (spec §4a): operator beat 42, respondent beat 40 -> CONFLICT_PROVEN.
    anchorContest: {
      regime: "meta",
      section_id: "evidence_anchored_at_beat",
      verb: "dispute_by_recomputation",
      claimed_value: 40,
      recompute_kind: "stage4n_beat_index",
      evidence_digest: d(anchor40),
    },
    // Clock on both sides: the answer's own beat, VERIFIED.
    filedAtBeat: {
      regime: "meta",
      section_id: "filed_at_beat",
      verb: "dispute_by_recomputation",
      claimed_value: 43,
      recompute_kind: "stage4n_beat_index",
      evidence_digest: d(anchor43),
    },
    privKeyPem: readKey("vdp-respondent"),
    pubKeyPem: readPub("vdp-respondent"),
  });
  return {
    capsuleBundle: green.bundle,
    counterCapsule,
    capsulePubKeyPem: green.pubKeyPem,
    respondentPubKeyPem: readPub("vdp-respondent"),
  };
}

// Mirror Test (spec §7 family 4): re-derive every evidence_backed section of the
// capsule from ITS OWN evidence, re-sealed as respondent census -> all AGREED.
export function buildMirrorContest() {
  const green = buildGreenBundle();
  const capsule = green.bundle.content;
  const arts = capsule.evidence_artifacts.map((a) => JSON.parse(JSON.stringify(a)));
  const byDigest = Object.fromEntries(arts.map((a) => [recordDigest(a), a]));
  // P1 #11 — one partition oracle (same source of truth deriveSectionStatus uses),
  // not the capsule's own `class` field, so mirror + derivation cannot drift apart.
  const contests = capsule.projected_sections
    .filter((p) => PARTITIONS[p.regime]?.[p.section_id] === "evidence_backed")
    .map((p) => ({
      regime: p.regime,
      section_id: p.section_id,
      verb: "dispute_by_recomputation",
      claimed_value: p.value,
      recompute_kind: p.recompute_kind,
      evidence_digest: p.evidence_digest,
    }));
  for (const c of contests) if (!byDigest[c.evidence_digest]) throw new Error("mirror gap");
  const counterCapsule = buildCounterCapsule({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    contests,
    respondentRole: "unspecified",
    respondentCensus: censusOf(arts),
    respondentArtifacts: arts,
    privKeyPem: readKey("vdp-respondent"),
    pubKeyPem: readPub("vdp-respondent"),
  });
  return {
    capsuleBundle: green.bundle,
    counterCapsule,
    capsulePubKeyPem: green.pubKeyPem,
    respondentPubKeyPem: readPub("vdp-respondent"),
  };
}
