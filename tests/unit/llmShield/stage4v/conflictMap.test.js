import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recordDigest,
  canonicalJson,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  deriveSectionStatus,
  deriveConflictMap,
} from "../../../../tools/simurgh-attestation/stage4v/core/conflictMap.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

const E = "vic-incident-epoch-0001";
const kernel3 = {
  kind: "kernel_decision_records",
  epoch: E,
  decisions: [{ decision: "blocked" }, { decision: "blocked" }, { decision: "blocked" }],
};
const chainWrong = { kind: "stage4s_chain_bundle", epoch: E, participants: ["a"] };
const arts = { [recordDigest(kernel3)]: kernel3, [recordDigest(chainWrong)]: chainWrong };
const base = {
  regime: "gpai_art55",
  section_id: "serious_incident_response",
  recompute_kind: "kernel_block_record",
  evidence_digest: recordDigest(kernel3),
};
const ctx = { chainVerdict: (a) => a.recorded_verdict };

test("frozen status table — geometry over intent", () => {
  assert.deepEqual(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }),
    { status: "CONFLICT_PROVEN", respondent_value: 3 }
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 3,
      artifacts: arts,
      ctx,
    }).status,
    "AGREED"
  );
  assert.deepEqual(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 5 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }),
    { status: "DISPUTE_FAILED", subreason: "recompute_failed" }
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 3,
      artifacts: arts,
      ctx,
    }).status,
    "AGREED"
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "evidence_backed",
      operatorValue: 2,
      artifacts: arts,
      ctx,
    }).subreason,
    "recompute_failed"
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "agree", claimed_value: 3 },
      cls: "not_derivable",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).subreason,
    "section_not_contestable"
  );
  assert.equal(
    deriveSectionStatus({
      contest: { ...base, verb: "dispute_by_recomputation", claimed_value: 3 },
      cls: "not_derivable",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).status,
    "ABSENCE_REBUTTED"
  );
  assert.equal(
    deriveSectionStatus({
      contest: {
        regime: "gpai_art55",
        section_id: "root_cause_analysis",
        verb: "dispute_as_judgment",
        judgment_text_digest: "sha256:" + "0".repeat(64),
      },
      cls: "requires_human_input",
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).status,
    "DISPUTE_RECORDED"
  );
  assert.equal(
    deriveSectionStatus({
      contest: {
        regime: "gpai_art55",
        section_id: "no_such_section",
        verb: "dispute_as_judgment",
        judgment_text_digest: "sha256:" + "0".repeat(64),
      },
      cls: undefined,
      operatorValue: undefined,
      artifacts: arts,
      ctx,
    }).subreason,
    "section_not_contestable"
  );
});

test("KIND_EVIDENCE_SOURCE gate: wrong artifact kind -> recompute_failed (P1 #7)", () => {
  // stage4s_chain_verdict recompute_kind, but evidence points at a kernel artifact.
  const out = deriveSectionStatus({
    contest: {
      regime: "gpai_art55",
      section_id: "chain_of_events",
      verb: "dispute_by_recomputation",
      claimed_value: 108,
      recompute_kind: "stage4s_chain_verdict",
      evidence_digest: recordDigest(kernel3),
    },
    cls: "evidence_backed",
    operatorValue: 108,
    artifacts: arts,
    ctx,
  });
  assert.deepEqual(out, { status: "DISPUTE_FAILED", subreason: "recompute_failed" });
});

test("deriveConflictMap: sections, uncontested ledger, rescore signals, determinism", () => {
  const green = buildGreenBundle();
  const consent = { kind: "stage4o_consent_manifests", epoch: E, scope: ["mail.read"] };
  const kernel2 = {
    kind: "kernel_decision_records",
    epoch: E,
    decisions: [{ decision: "blocked" }, { decision: "blocked" }],
  };
  const respArts = { [recordDigest(consent)]: consent, [recordDigest(kernel2)]: kernel2 };
  const cc = {
    binding: { note: "echo" },
    respondent_role: "deployer",
    contests: [
      {
        regime: "gpai_art55",
        section_id: "serious_incident_response",
        verb: "dispute_by_recomputation",
        claimed_value: 2,
        recompute_kind: "kernel_block_record",
        evidence_digest: recordDigest(kernel2),
      },
      {
        regime: "gpai_art55",
        section_id: "evidence_available",
        verb: "dispute_by_recomputation",
        claimed_value: ["mail.read"],
        recompute_kind: "consent_manifest_scope",
        evidence_digest: recordDigest(consent),
      },
    ],
    respondent_evidence_artifacts: [consent, kernel2],
  };
  const m1 = deriveConflictMap(green.bundle, cc, ctx);
  const m2 = deriveConflictMap(green.bundle, cc, ctx);
  assert.equal(m1.sections.length, 2);
  assert.equal(m1.respondent_role, "deployer");
  assert.equal(m1.partition_rescore_signals.length, 1); // evidence_available ABSENCE_REBUTTED
  assert.ok(m1.uncontested_sections.length > 0);
  assert.ok(!m1.uncontested_sections.includes("gpai_art55/serious_incident_response"));
  assert.equal(canonicalJson(m1), canonicalJson(m2)); // deterministic
});
