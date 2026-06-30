// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  basePackView,
  buildPremiseSet,
  premiseDigest,
  premiseId,
} from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";

const STAGE4D_PACK_PATH =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json";
const fixtureRoot = "tests/fixtures/llmShield/stage4h";

function loadPack() {
  return JSON.parse(readFileSync(STAGE4D_PACK_PATH, "utf8"));
}

test("Stage 4H premise projection is metadata-only and byte-stable", () => {
  const pack = loadPack();
  const premises = buildPremiseSet(pack);
  assert.equal(premises.type, "simurgh.vca.dfi_premises.v1");
  assert.match(premises.base_pack_digest, /^sha256:[a-f0-9]{64}$/);
  assert.match(premises.replay_root, /^sha256:[a-f0-9]{64}$/);
  assert.match(premiseDigest(premises), /^sha256:[a-f0-9]{64}$/);
  assert.equal(premiseDigest(premises), premiseDigest(buildPremiseSet(pack)));
  assert.equal(JSON.stringify(premises).includes("raw_prompt"), false);
  assert.equal(JSON.stringify(premises).includes("provider_transcript"), false);
});

test("Stage 4H premise IDs are stable and include kind", () => {
  const id = premiseId({ kind: "authority_sink", stable_fields: { sink_id: "wire_transfer" } });
  assert.match(id, /^premise:sha256:[a-f0-9]{64}$/);
  assert.equal(
    id,
    premiseId({ stable_fields: { sink_id: "wire_transfer" }, kind: "authority_sink" })
  );
});

test("Stage 4H premise projection changes when replay data changes", () => {
  const pack = loadPack();
  const original = premiseDigest(buildPremiseSet(pack));
  const mutated = structuredClone(pack);
  const actionId = Object.keys(mutated.replay_material)[0];
  mutated.replay_material[actionId].taint_derivation_inputs.sources.push({
    source_id: "untrusted_extra",
    label: "untrusted",
  });
  assert.notEqual(premiseDigest(buildPremiseSet(mutated)), original);
});

test("Stage 4H base-pack view ignores non-view top-level metadata", () => {
  const pack = loadPack();
  const withExtra = { ...pack, stage4h_certificate: { should_not_bind: true } };
  assert.deepEqual(basePackView(withExtra), basePackView(pack));
  assert.equal(buildPremiseSet(withExtra).base_pack_digest, buildPremiseSet(pack).base_pack_digest);
});

test("Stage 4H.1 does not alter 4H.0 digest surfaces", () => {
  const pack = JSON.parse(readFileSync(`${fixtureRoot}/q1-clean-base-pack.json`, "utf8"));
  const certificate = JSON.parse(
    readFileSync(`${fixtureRoot}/q1-clean-dfi-certificate.json`, "utf8")
  );
  const premises = buildPremiseSet(pack);

  assert.equal(certificate.base_pack_digest, premises.base_pack_digest);
  assert.equal(certificate.replay_root, premises.replay_root);
  assert.equal(certificate.policy_digest, premises.policy_digest);
  assert.equal(certificate.lattice_digest, premises.lattice_digest);
  assert.equal(certificate.premise_digest, premiseDigest(premises));
});
