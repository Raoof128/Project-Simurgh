// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyExternalDefense } from "../../../../tools/simurgh-attestation/verify-stage3v-external-defense.mjs";
import { buildExternalDefenseBundle } from "../../../../tests/e2e/llm_shield_stage3v_external_defense_runner.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3v";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3v-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  const r = verifyExternalDefense({ bundle, sidecar, publicKeyPem: pub });
  assert.equal(r.ok, true);
});
test("reproduce verify passes + emits explicit recompute checks (Amendment 2)", () => {
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
  assert.equal(r.checks.reproduce, true);
});
test("reproduce without rebuild fails closed (branch)", () => {
  assert.equal(verifyExternalDefense({ bundle, sidecar, publicKeyPem: pub, reproduce: true }).ok, false);
});
test("tampered bundle fails (signature mismatch)", () => {
  const bad = { ...bundle, stage: "TAMPERED" };
  assert.equal(verifyExternalDefense({ bundle: bad, sidecar, publicKeyPem: pub }).ok, false);
});
test("wrong public key fails", () => {
  const { publicKey } = crypto.generateKeyPairSync("ed25519");
  const wrong = publicKey.export({ type: "spki", format: "pem" });
  assert.equal(verifyExternalDefense({ bundle, sidecar, publicKeyPem: wrong }).ok, false);
});
test("fails closed (ok:false, no throw) on malformed input (branch)", () => {
  assert.doesNotThrow(() => verifyExternalDefense({}));
  assert.equal(verifyExternalDefense({}).ok, false);
  assert.equal(verifyExternalDefense({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
