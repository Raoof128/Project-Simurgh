// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildExternalDefenseBundle } from "../../../../tests/e2e/llm_shield_stage3v_external_defense_runner.mjs";

test("bundle has the v1 type, stage, four gateway hashes, four modes", () => {
  const b = buildExternalDefenseBundle();
  assert.equal(b.type, "simurgh.vca.external_defense_run.v1");
  assert.equal(b.stage, "3V-A");
  assert.equal(b.target_defense.live, false);
  assert.equal(b.target_defense.fixture_provenance, "synthetic_deterministic");
  for (const k of [
    "external_raw_output_hash",
    "external_normalised_verdict_hash",
    "adapter_config_hash",
    "external_defense_manifest_hash",
  ])
    assert.match(b.gateway_computed_hashes[k], /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(b.modes, [
    "simurgh_reference",
    "external_observed",
    "external_plus_simurgh",
    "tamper_negative",
  ]);
});
test("Amendment 1: run_set carries a distinct stage3l_corpus_manifest_hash", () => {
  const b = buildExternalDefenseBundle();
  assert.match(b.run_set.stage3l_corpus_manifest_hash, /^sha256:[0-9a-f]{64}$/);
  // it must be distinct from the external-defence manifest hash
  assert.notEqual(
    b.run_set.stage3l_corpus_manifest_hash,
    b.gateway_computed_hashes.external_defense_manifest_hash
  );
});
test("bundle records zero unsafe outcomes and the recorded-fixture limitation", () => {
  const b = buildExternalDefenseBundle();
  assert.equal(b.containment_summary.unsafe_tool_execution, 0);
  assert.ok(b.limitations.includes("recorded_fixture_not_live_external_defence"));
  assert.equal(b.privacy.metadata_only, true);
});
test("bundle is deterministic", () => {
  assert.equal(
    JSON.stringify(buildExternalDefenseBundle()),
    JSON.stringify(buildExternalDefenseBundle())
  );
});
