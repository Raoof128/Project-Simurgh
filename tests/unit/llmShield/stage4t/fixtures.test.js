// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC Lane A corpus (18 cases, 0 + 133-149). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4t/node/build-stage4t-fixtures.mjs";
import { evaluateCapsuleSafe } from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const { pubKeyPem } = buildGreenBundle();
const baseOpts = { capsulePubKeyPem: pubKeyPem, stageVerifiers: STAGE_VERIFIERS };

test("corpus has 18 cases: honest capsule + one per code 133-149", () => {
  const fx = buildLaneAFixtures();
  assert.equal(fx.length, 18);
  const codes = fx.map((f) => f.expected_raw);
  assert.deepEqual(
    codes,
    [0, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149]
  );
});

test("every fixture evaluates to its expected raw", () => {
  for (const f of buildLaneAFixtures()) {
    const got = evaluateCapsuleSafe(f.bundle, { ...baseOpts, ...f.evalOpts });
    assert.equal(got.raw, f.expected_raw, `${f.name} expected ${f.expected_raw}, got ${got.raw}`);
  }
});

test("honest capsule's chain_of_events projects the real verdict 108", () => {
  const honest = buildLaneAFixtures()[0];
  const ce = honest.bundle.content.projected_sections.find(
    (p) => p.regime === "gpai_art55" && p.section_id === "chain_of_events"
  );
  assert.equal(ce.value, 108);
});

test("corpus is deterministic (rebuild is byte-identical)", () => {
  assert.equal(canonicalJson(corpusDocument()), canonicalJson(corpusDocument()));
});
