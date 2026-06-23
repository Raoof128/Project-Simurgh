import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBundle, buildWitnessVerdictFile } from "../../../../tools/simurgh-attestation/build-3w-witness.mjs";

test("bundle is an in-toto release-witness binding the witness-verdict file", () => {
  const b = buildBundle();
  assert.equal(b._type, "https://in-toto.io/Statement/v1");
  assert.equal(b.predicate.witnessed_stage, "3V-B");
  assert.equal(b.predicate.online_witness.required_for_offline_verification, false);
  const names = b.subject.map((s) => s.name);
  assert.ok(names.includes("stage-3w/github-witness-verdict.json"));
});
test("bundle + verdict are deterministic", () => {
  assert.deepEqual(buildBundle(), buildBundle());
  assert.deepEqual(buildWitnessVerdictFile(), buildWitnessVerdictFile());
});
