// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC capsule integration (frozen order, 146/147/150). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCapsule,
  evaluateCapsuleSafe,
  capsuleAttestationDigest,
} from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";
import {
  buildGreenBundle,
  resignGreen,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

const { bundle, pubKeyPem, realVerdict } = buildGreenBundle();
const OPTS = { capsulePubKeyPem: pubKeyPem, stageVerifiers: STAGE_VERIFIERS };
const clone = (x) => JSON.parse(JSON.stringify(x));
const reseal = (m) => {
  m.attestation_digest = capsuleAttestationDigest(m);
  return m;
};

test("the incident chain is a real 4S over-scoped crossing → verdict 108", () => {
  assert.equal(realVerdict, 108);
});

test("green capsule evaluates to raw 0", () => {
  assert.deepEqual(evaluateCapsule(bundle, OPTS), { raw: 0 });
});

test("133 on a malformed bundle schema", () => {
  const m = clone(bundle);
  m.schema = "nope";
  assert.equal(evaluateCapsule(m, OPTS).raw, 133);
});

test("133 on a duplicate regime binding", () => {
  const m = clone(bundle);
  m.content.template_bindings[1].regime = "gpai_art55";
  assert.equal(evaluateCapsule(reseal(m), OPTS).raw, 133);
});

test("134 on a tampered signature", () => {
  const m = clone(bundle);
  m.content.signature = "00".repeat(32);
  assert.equal(evaluateCapsule(reseal(m), OPTS).raw, 134);
});

test("134 when the wrong public key is supplied", () => {
  assert.equal(evaluateCapsule(bundle, { ...OPTS, capsulePubKeyPem: undefined }).raw, 134);
});

test("142 when an evidence_backed value is corrupted", () => {
  const m = clone(bundle);
  const ps = m.content.projected_sections.find((p) => p.class === "evidence_backed");
  ps.value = "TAMPERED";
  assert.equal(evaluateCapsule(resignGreen(m), OPTS).raw, 142);
});

test("146 when the recorded chain verdict is falsified (claim green over a real 108)", () => {
  const falsified = buildGreenBundle({ falsifyChainVerdict: true });
  assert.equal(
    evaluateCapsule(falsified.bundle, {
      capsulePubKeyPem: falsified.pubKeyPem,
      stageVerifiers: STAGE_VERIFIERS,
    }).raw,
    146
  );
});

test("147 when the two-stage digest is wrong", () => {
  const m = clone(bundle);
  m.attestation_digest = "sha256:" + "4".repeat(64);
  assert.equal(evaluateCapsule(m, OPTS).raw, 147);
});

test("150 fail-closed on a poisoned bundle", () => {
  const m = clone(bundle);
  m.content.evidence_manifest = 42; // provokes a throw deep in a helper
  const r = evaluateCapsuleSafe(m, OPTS);
  assert.ok(r.raw === 150 || r.raw === 133, `got ${r.raw}`);
});

test("check-order: census (139) beats suppression (143)", () => {
  const m = clone(bundle);
  // smuggle an artifact (139) AND suppress a derivable section (143) — census runs first.
  m.content.evidence_artifacts.push({ kind: "smuggled", epoch: m.content.epoch, x: 1 });
  const ps = m.content.projected_sections.find((p) => p.class === "evidence_backed");
  delete ps.value;
  delete ps.evidence_digest;
  delete ps.recompute_kind;
  ps.class = "not_derivable";
  assert.equal(evaluateCapsule(resignGreen(m), OPTS).raw, 139);
});
