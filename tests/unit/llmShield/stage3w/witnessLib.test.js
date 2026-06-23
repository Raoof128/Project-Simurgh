import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WITNESSED_3VB,
  computeStage3vbSubjects,
  buildWitnessVerdict,
  buildReleaseWitnessStatement,
} from "../../../../tools/simurgh-attestation/stage3wWitnessLib.mjs";

test("WITNESSED_3VB pins the sealed 3V-B release and is frozen", () => {
  assert.equal(WITNESSED_3VB.commit, "b645d80");
  assert.match(WITNESSED_3VB.tag, /^v2\.6\.0-stage-3v-b/);
  assert.equal(Object.isFrozen(WITNESSED_3VB), true);
});

test("computeStage3vbSubjects returns four sha256-prefixed digests", () => {
  const s = computeStage3vbSubjects();
  const keys = Object.keys(s).sort();
  assert.deepEqual(keys, [
    "stage-3v-b/attestation.bundle.json",
    "stage-3v-b/attestation.signature.json",
    "stage-3v-b/capture-replay/lg4-frozen-capture.json",
    "stage-3v-b/evidence-hashes.json",
  ]);
  assert.equal(
    Object.values(s).every((v) => /^sha256:[0-9a-f]{64}$/.test(v)),
    true
  );
});

test("buildWitnessVerdict default is observed-not-echoed and expected==observed", () => {
  const v = buildWitnessVerdict();
  assert.equal(v.schema, "simurgh.stage3w.github_witness_verdict.v1");
  assert.equal(v.verification_mode, "ci_observed_not_echoed");
  assert.equal(v.expected_equals_observed, true);
  assert.deepEqual(v.expected, v.ci_observed);
  assert.equal(v.expected.model_reexecuted_in_ci, false);
  assert.equal(Object.keys(v.subjects).length, 4);
});

test("buildWitnessVerdict flags divergence when observed != expected", () => {
  const v = buildWitnessVerdict({ stage3vb_verifier: "FAIL" });
  assert.equal(v.ci_observed.stage3vb_verifier, "FAIL");
  assert.equal(v.expected_equals_observed, false);
});

test("buildReleaseWitnessStatement binds 3V-B subjects + witness-verdict file, not Sigstore", () => {
  const subjects = computeStage3vbSubjects();
  const stmt = buildReleaseWitnessStatement(subjects, "sha256:" + "a".repeat(64));
  assert.equal(stmt._type, "https://in-toto.io/Statement/v1");
  assert.equal(stmt.predicateType, "https://project-simurgh.dev/predicates/vca-release-witness/v1");
  const names = stmt.subject.map((s) => s.name).sort();
  assert.ok(names.includes("stage-3w/github-witness-verdict.json"));
  assert.ok(names.includes("stage-3v-b/attestation.bundle.json"));
  assert.equal(stmt.predicate.witnessed_stage, "3V-B");
  assert.equal(stmt.predicate.release_commit, "b645d80");
  assert.equal(stmt.predicate.model_reexecuted_in_ci, false);
  assert.equal(stmt.predicate.online_witness.required_for_offline_verification, false);
  assert.ok(stmt.predicate.non_claims.includes("does_not_reduce_live_capture_origin_self_reported"));
});
