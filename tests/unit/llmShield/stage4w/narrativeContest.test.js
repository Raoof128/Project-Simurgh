import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  contestSlotSpan,
  contestProseSpanClassification,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeContest.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

test("slot-span contest: AGREED when respondent matches operator; CONFLICT_PROVEN when it differs", () => {
  const g = buildGreenBundle();
  const section = g.bundle.content.projected_sections.find(
    (p) => p.class === "evidence_backed" && p.recompute_kind === "participant_count"
  );
  const artifact = g.bundle.content.evidence_artifacts.find(
    (a) => recordDigest(a) === section.evidence_digest
  );
  // AGREE: respondent recomputes the operator's own sealed evidence -> operator value.
  const agreed = contestSlotSpan({
    capsuleBundle: g.bundle,
    span: { regime: section.regime, section_id: section.section_id },
    contest: {
      verb: "agree",
      recompute_kind: section.recompute_kind,
      evidence_digest: section.evidence_digest,
    },
    artifacts: { [section.evidence_digest]: artifact },
    ctx: {},
  });
  assert.equal(agreed.status, "AGREED");

  // Reviewer P1 #8 — a REAL CONFLICT_PROVEN: the respondent brings its OWN
  // self-consistent evidence recomputing to a value that differs from the operator's.
  const respondentArtifact = {
    kind: "stage4s_chain_bundle",
    participants: [...(artifact.participants ?? []), "respondent-extra-1", "respondent-extra-2"],
  };
  const respondentDigest = recordDigest(respondentArtifact);
  const respondentClaim = (artifact.participants ?? []).length + 2; // != operator value
  const conflict = contestSlotSpan({
    capsuleBundle: g.bundle,
    span: { regime: section.regime, section_id: section.section_id },
    contest: {
      verb: "dispute_by_recomputation",
      claimed_value: respondentClaim,
      recompute_kind: section.recompute_kind,
      evidence_digest: respondentDigest,
    },
    artifacts: { [respondentDigest]: respondentArtifact },
    ctx: {},
  });
  assert.equal(conflict.status, "CONFLICT_PROVEN");
  assert.equal(conflict.respondent_value, respondentClaim);
});

test("prose-span classification contest is recorded, never recomputed", () => {
  const r = contestProseSpanClassification({
    span_id: "p1",
    judgment_text_digest: "sha256:" + "a".repeat(64),
  });
  assert.equal(r.status, "DISPUTE_RECORDED");
  assert.equal(r.kind, "classification_contest");
});

test("no cloned court: module imports 4V deriveSectionStatus, defines no local table", () => {
  const src = readFileSync("tools/simurgh-attestation/stage4w/core/narrativeContest.mjs", "utf8");
  assert.ok(src.includes('from "../../stage4v/core/conflictMap.mjs"'));
  assert.ok(!src.includes('"CONFLICT_PROVEN"')); // no local status literals
});
