// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U corpus tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCorpus } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs";
import {
  FAMILY_COUNTS,
  ATTACK_FAMILIES,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";
import { evaluateVrta } from "../../../../tools/simurgh-attestation/stage4u/core/vrtaCore.mjs";

test("corpus builds 58 fixtures across 8 families, all bound and complete", () => {
  const { bundle } = buildCorpus({ write: false });
  assert.equal(bundle.attack_fixtures.length, 58);
  assert.equal(bundle.finding_records.length, 58);
  for (const fam of ATTACK_FAMILIES)
    assert.equal(bundle.attack_fixtures.filter((f) => f.family === fam).length, FAMILY_COUNTS[fam]);
});
test("the assembled corpus bundle passes the audit-tier verifier GREEN", () => {
  const { bundle, engine, charterPub, findingPub } = buildCorpus({ write: false });
  assert.deepEqual(
    evaluateVrta(bundle, { pubKeyPem: charterPub, findingPubKeyPem: findingPub, engine }),
    { raw: 0, reason: "green" }
  );
});
test("honest ASR is 0/58 (every attack is contained)", () => {
  const { bundle } = buildCorpus({ write: false });
  assert.deepEqual(bundle.asr, { confirmed_bypass: 0, executed_non_refusal: 58, ratio: "0/58" });
  for (const f of bundle.finding_records) assert.notEqual(f.outcome_class, "bypass");
});
test("corpus is deterministic (two builds → identical fixtures)", () => {
  const a = buildCorpus({ write: false }).bundle;
  const b = buildCorpus({ write: false }).bundle;
  assert.deepEqual(a.attack_fixtures, b.attack_fixtures);
});
