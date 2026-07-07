import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGreenNarrative } from "../../../../tools/simurgh-attestation/stage4w/node/greenNarrative.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4w/node/build-stage4w-fixtures.mjs";
import {
  evaluateNarrativeSafe,
  computeEvidenceDensity,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeCore.mjs";
import { VSN_LANE_A_CORPUS_SCHEMA } from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("green narrative: raw 0, all three span types, multi-byte body", () => {
  const g = buildGreenNarrative();
  const r = evaluateNarrativeSafe(g.capsuleBundle, g.narrative, {
    capsulePubKeyPem: g.capsulePubKeyPem,
    ctx: {},
  });
  assert.equal(r.raw, 0);
  const types = new Set(g.narrative.content.span_map.map((s) => s.type));
  assert.deepEqual([...types].sort(), ["judgment", "slot_bound", "unverified_prose"]);
  assert.ok(g.narrative.content.narrative_body.includes("سیمرغ"));
});

test("every Lane A fixture verifies to its declared raw code", () => {
  const g = buildGreenNarrative();
  for (const f of buildLaneAFixtures()) {
    const r = evaluateNarrativeSafe(g.capsuleBundle, f.narrative, {
      capsulePubKeyPem: g.capsulePubKeyPem,
      ctx: {},
    });
    assert.equal(r.raw, f.expected_raw, `${f.name}: got ${r.raw} (${r.reason ?? ""})`);
  }
});

test("every raw 162-171 is covered by at least one fixture", () => {
  const covered = new Set(buildLaneAFixtures().map((f) => f.expected_raw));
  for (const raw of [162, 163, 164, 165, 166, 167, 168, 169, 170, 171])
    assert.ok(covered.has(raw), `raw ${raw} has no fixture`);
});

test("density fixture equals an independent recount; corpus is signed + complete", () => {
  const g = buildGreenNarrative();
  const d = computeEvidenceDensity(g.narrative.content);
  const recount = g.narrative.content.span_map.reduce(
    (acc, s) => acc + (s.type === "slot_bound" ? s.end_byte - s.start_byte : 0),
    0
  );
  assert.equal(d.slot_bound_bytes, recount);
  const corpus = corpusDocument();
  assert.equal(corpus.content.schema, VSN_LANE_A_CORPUS_SCHEMA);
  assert.ok(corpus.content.cases.length >= 22);
  assert.ok(corpus.signature.length > 0);
});
