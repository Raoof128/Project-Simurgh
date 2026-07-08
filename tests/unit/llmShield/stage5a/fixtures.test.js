// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — the 16-fixture Lane A corpus (plan Task 10). Each fixture reaches EXACTLY its
// target code at both tiers; the corpus is byte-stable. Motto: AnthropicSafe First, then
// ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { evaluateVnc } from "../../../../tools/simurgh-attestation/stage5a/core/vncCore.mjs";
import { buildFixtures } from "../../../../tools/simurgh-attestation/stage5a/node/build-stage5a-fixtures.mjs";
import {
  VNC_PUB,
  VWA_PUB,
} from "../../../../tools/simurgh-attestation/stage5a/node/greenBundle.mjs";

const keys = { vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VWA_PUB };

test("corpus has all 16 fixtures with the expected set breakdown", () => {
  const fx = buildFixtures();
  assert.equal(fx.length, 16);
  assert.equal(fx.filter((f) => f.set === "clean").length, 5);
  assert.equal(fx.filter((f) => f.set === "tamper").length, 9);
  assert.equal(fx.filter((f) => f.set === "pilot" || f.set === "rcp").length, 2);
});

for (const fx of buildFixtures()) {
  test(`fixture ${fx.id}: public → ${fx.public_raw}, audit → ${fx.audit_raw}`, () => {
    const pub = evaluateVnc(fx.bundle, { ...keys, tier: "public" });
    assert.equal(pub.raw, fx.public_raw, `${fx.id} public: ${JSON.stringify(pub)}`);
    const aud = evaluateVnc(fx.bundle, { ...keys, tier: "audit" });
    assert.equal(aud.raw, fx.audit_raw, `${fx.id} audit: ${JSON.stringify(aud)}`);
  });
}

test("the headline pair: a recorded contradiction is CLEAN content; flipping it is 205", () => {
  const fx = buildFixtures();
  const conflict = fx.find((f) => f.id === "eval_awareness_conflict");
  const twoStories = fx.find((f) => f.id === "tamper_two_stories");
  // the conflict verifies clean AND the ledger actually records a contradiction
  assert.equal(evaluateVnc(conflict.bundle, keys).raw, 0);
  const verdicts = conflict.bundle.ledger.content.verdicts;
  assert.equal(verdicts[0].verdict, "contradicted");
  assert.ok(verdicts[0].evidence.length > 0);
  // the same inputs with the verdict laundered to corroborated → 205
  assert.equal(evaluateVnc(twoStories.bundle, keys).raw, 205);
});

test("corpus is byte-stable: building twice yields identical canonical bytes", () => {
  const a = buildFixtures();
  const b = buildFixtures();
  for (let i = 0; i < a.length; i++)
    assert.equal(canonicalJson(a[i].bundle), canonicalJson(b[i].bundle), a[i].id);
});
