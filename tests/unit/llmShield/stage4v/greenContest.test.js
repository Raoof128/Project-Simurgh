import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGreenContest,
  buildMirrorContest,
} from "../../../../tools/simurgh-attestation/stage4v/node/greenContest.mjs";
import { evaluateContestSafe } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import {
  STAGE_VERIFIERS,
  buildGreenBundle,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { RECOMPUTE_REGISTRY } from "../../../../tools/simurgh-attestation/stage4t/core/projectionCore.mjs";
import { PARTITIONS } from "../../../../tools/simurgh-attestation/stage4t/constants.mjs";

// P1 #12 — preflight: fail loudly if a prior stage moved the assumed values.
test("preflight: 4T green capsule matches the values buildGreenContest assumes", () => {
  for (const k of [
    "kernel_block_record",
    "participant_count",
    "consent_manifest_scope",
    "stage4n_beat_index",
  ])
    assert.ok(RECOMPUTE_REGISTRY[k], `registry missing ${k}`);
  const ps = buildGreenBundle().bundle.content.projected_sections;
  const val = (r, s) => ps.find((p) => p.regime === r && p.section_id === s)?.value;
  assert.equal(val("art73_high_risk_draft", "remedial_actions"), 2);
  assert.equal(val("art73_high_risk_draft", "users_affected"), 2);
  assert.equal(PARTITIONS.gpai_art55.evidence_available, "not_derivable");
  assert.equal(buildGreenBundle().bundle.content.evidence_anchored_at_beat.value, 42);
});

test("green contest: raw 0, all five statuses, anchor conflict, deployer, beat verified", () => {
  const g = buildGreenContest();
  const { raw, envelope } = evaluateContestSafe(g.capsuleBundle, g.counterCapsule, {
    capsulePubKeyPem: g.capsulePubKeyPem,
    respondentPubKeyPem: g.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 0);
  assert.equal(envelope.capsule_reverify_result, 0);
  assert.equal(envelope.filed_at_beat_status, "VERIFIED");
  const statuses = envelope.result.sections.map((s) => s.status);
  assert.deepEqual([...new Set(statuses)].sort(), [
    "ABSENCE_REBUTTED",
    "AGREED",
    "CONFLICT_PROVEN",
    "DISPUTE_FAILED",
    "DISPUTE_RECORDED",
  ]);
  assert.equal(envelope.result.anchor_status.status, "CONFLICT_PROVEN");
  assert.equal(envelope.result.respondent_role, "deployer");
  assert.equal(envelope.result.partition_rescore_signals.length, 1);
});

test("mirror contest: all AGREED (mirror_contest_all_agreed hard gate twin)", () => {
  const m = buildMirrorContest();
  const { raw, envelope } = evaluateContestSafe(m.capsuleBundle, m.counterCapsule, {
    capsulePubKeyPem: m.capsulePubKeyPem,
    respondentPubKeyPem: m.respondentPubKeyPem,
    stageVerifiers: STAGE_VERIFIERS,
  });
  assert.equal(raw, 0);
  assert.ok(envelope.result.sections.length >= 6);
  assert.ok(envelope.result.sections.every((s) => s.status === "AGREED"));
});
