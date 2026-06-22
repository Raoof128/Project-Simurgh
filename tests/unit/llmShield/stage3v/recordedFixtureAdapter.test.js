// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  recordedFixtureObservations,
  recordedRawOutputs,
  buildExternalDefenseManifest,
  externalDefenseManifestDigest,
} from "../../../../tools/external-defense-adapters/recordedFixtureExternalDefenseAdapter.mjs";
import { buildStage3lCorpus } from "../../../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

test("one validated observation per 3L case (180)", () => {
  const corpus = buildStage3lCorpus();
  const obs = recordedFixtureObservations();
  assert.equal(obs.length, corpus.length);
  const caseIds = new Set(corpus.map((f) => f.case_id));
  for (const o of obs) assert.ok(caseIds.has(o.case_id), `unknown case ${o.case_id}`);
});
test("benign cases get allow; direct attacks get block (deterministic fixture policy)", () => {
  const byId = Object.fromEntries(recordedFixtureObservations().map((o) => [o.case_id, o]));
  const benign = Object.keys(byId).find((id) => id.includes("benign"));
  const direct = Object.keys(byId).find((id) => id.includes("direct_input_attack"));
  assert.equal(byId[benign].normalised_verdict, "allow");
  assert.equal(byId[direct].normalised_verdict, "block");
});
test("raw outputs are keyed by case and are non-empty strings (fixtures only)", () => {
  const raw = recordedRawOutputs();
  for (const o of recordedFixtureObservations()) assert.equal(typeof raw[o.case_id], "string");
});
test("manifest digest is deterministic and sha256-prefixed", () => {
  const m = buildExternalDefenseManifest(recordedFixtureObservations());
  assert.match(externalDefenseManifestDigest(m), /^sha256:[0-9a-f]{64}$/);
  assert.equal(externalDefenseManifestDigest(m), externalDefenseManifestDigest(m));
});
test("observations never carry a hash field", () => {
  for (const o of recordedFixtureObservations())
    assert.ok(!Object.keys(o).some((k) => /hash|digest/i.test(k)));
});
