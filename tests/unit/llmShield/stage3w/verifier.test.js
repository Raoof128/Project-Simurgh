import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyWitness } from "../../../../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import {
  buildBundle,
  buildWitnessVerdictFile,
} from "../../../../tools/simurgh-attestation/build-3w-witness.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const bundle = JSON.parse(readFileSync(`${EV}/attestation.bundle.json`, "utf8"));
const sidecar = JSON.parse(readFileSync(`${EV}/attestation.signature.json`, "utf8"));
const pub = JSON.parse(readFileSync(`${EV}/keys/stage3w-public-key.json`, "utf8")).public_key_pem;

test("portable verify passes on committed evidence", () => {
  assert.equal(verifyWitness({ bundle, sidecar, publicKeyPem: pub }).ok, true);
});
test("reproduce recomputes subjects + witness-verdict", () => {
  const r = verifyWitness({
    bundle,
    sidecar,
    publicKeyPem: pub,
    reproduce: true,
    rebuild: buildBundle,
    rebuildVerdict: buildWitnessVerdictFile,
  });
  assert.equal(r.ok, true);
  assert.equal(r.checks.subjects_recomputed, true);
  assert.equal(r.checks.witness_verdict_recomputed, true);
});
test("fails closed on missing input (never throws)", () => {
  assert.equal(verifyWitness({ bundle: null, sidecar: null, publicKeyPem: null }).ok, false);
});
test("rejects a tampered release_commit", () => {
  const t = JSON.parse(JSON.stringify(bundle));
  t.predicate.release_commit = "deadbeef";
  assert.equal(verifyWitness({ bundle: t, sidecar, publicKeyPem: pub }).ok, false);
});
