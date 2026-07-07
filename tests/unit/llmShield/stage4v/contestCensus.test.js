import { test } from "node:test";
import assert from "node:assert/strict";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildRespondentCensus,
  respondentArtifactsIndex,
  referencedDigests,
  verifyRespondentCensus,
} from "../../../../tools/simurgh-attestation/stage4v/core/contestCensus.mjs";

const E = "vic-incident-epoch-0001";
const art = { kind: "stage4s_chain_bundle", epoch: E, participants: ["x"] };
const mk = () => ({
  respondent_census: buildRespondentCensus({
    epoch: E,
    items: [{ kind: art.kind, digest: recordDigest(art), epoch: E }],
  }),
  respondent_evidence_artifacts: [art],
});

test("green respondent census passes", () => {
  assert.equal(verifyRespondentCensus(mk(), E), null);
  assert.ok(respondentArtifactsIndex(mk())[recordDigest(art)]);
  assert.ok(referencedDigests({ contests: [] }) instanceof Set);
});
test("codes remap 138/139/140/145 -> 155/156/157/158", () => {
  const missing = mk();
  missing.respondent_evidence_artifacts = [];
  assert.equal(verifyRespondentCensus(missing, E).raw, 155);
  const smuggled = mk();
  smuggled.respondent_evidence_artifacts.push({
    kind: "kernel_decision_records",
    epoch: E,
    decisions: [],
  });
  assert.equal(verifyRespondentCensus(smuggled, E).raw, 156);
  const root = mk();
  root.respondent_census.census_root = "sha256:" + "0".repeat(64);
  assert.equal(verifyRespondentCensus(root, E).raw, 157);
  assert.equal(verifyRespondentCensus(mk(), "other-epoch").raw, 158);
});
test("contest references a digest not in the census -> 156 (P0 #3)", () => {
  const c = mk();
  c.contests = [
    {
      regime: "gpai_art55",
      section_id: "serious_incident_response",
      verb: "dispute_by_recomputation",
      claimed_value: 1,
      recompute_kind: "kernel_block_record",
      evidence_digest: "sha256:" + "a".repeat(64),
    },
  ];
  assert.equal(verifyRespondentCensus(c, E).raw, 156);
});
