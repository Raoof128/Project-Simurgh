import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyExternalDefense } from "../../../../tools/simurgh-attestation/verify-stage3vb-external-defense.mjs";
import { buildExternalDefenseBundle } from "../../../../tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v-b";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3vb-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  const r = verifyExternalDefense({ bundle, sidecar, publicKeyPem: pub });
  assert.equal(r.ok, true);
});
test("reproduce verify recomputes seven hashes + manifests", () => {
  const r = verifyExternalDefense({
    bundle,
    sidecar,
    publicKeyPem: pub,
    reproduce: true,
    rebuild: buildExternalDefenseBundle,
  });
  assert.equal(r.ok, true);
  assert.equal(r.checks.trusted_harness_hashes_recomputed, true);
  assert.equal(r.checks.stage3l_corpus_manifest_recomputed, true);
  assert.equal(r.checks.input_manifest_recomputed, true);
});
test("fails closed on missing input (never throws)", () => {
  const r = verifyExternalDefense({ bundle: null, sidecar: null, publicKeyPem: null });
  assert.equal(r.ok, false);
});
test("rejects a tampered metric", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.containment_summary.unsafe_tool_execution = 7;
  assert.equal(verifyExternalDefense({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
