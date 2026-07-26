// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Tasks 15-17 — the campaign contract, the head packs and the historical policy.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runCampaignPack,
  buildCampaign,
  CAMPAIGN_OUTCOMES,
  FINDING_OUTCOMES,
} from "../../../../../tools/simurgh-attestation/stage5q/core/campaign.mjs";
import { HEAD_PACKS } from "../../../../../tools/simurgh-attestation/stage5q/campaigns/head.mjs";
import { SEAM_PACKS } from "../../../../../tools/simurgh-attestation/stage5q/campaigns/seam.mjs";
import {
  tallyOutcomes,
  checkWeakerHistoricalSemantics,
  COMPATIBILITY_MATRIX,
  TAG_OUTCOMES,
} from "../../../../../tools/simurgh-attestation/stage5q/campaigns/historical.mjs";
import { ATTACK_CLASSES } from "../../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const CLOSURE = "c".repeat(64);

test("the head campaign is the SIX enumerated packs, each naming its target pair", () => {
  // "Combinations no single tray sees" is a description, not a task (gauntlet P1-26).
  assert.equal(HEAD_PACKS.length, 6);
  for (const p of HEAD_PACKS) {
    assert.match(p.pack_id, /^head\//);
    assert.equal(p.target_pair.length, 2, `${p.pack_id} must name a PAIR`);
    assert.ok(p.expectation.length > 40, `${p.pack_id} must state what must happen`);
    for (const c of p.attack_classes) assert.ok(ATTACK_CLASSES.includes(c));
  }
});

test("the seam campaign is the NINE §10 seams, and the hardest three are marked", () => {
  assert.equal(SEAM_PACKS.length, 9);
  const hardest = [
    "seam/valid-sig-wrong-object",
    "seam/nonclaim-promotion",
    "seam/mutual-exclusion",
  ];
  for (const id of hardest)
    assert.ok(
      SEAM_PACKS.some((p) => p.pack_id === id),
      id
    );
});

test("every seam pack declares its BASIS — modelled or shipped code", () => {
  // A campaign presenting a modelled seam as an executed one claims coverage it does not have,
  // which is R15 against ourselves.
  for (const p of SEAM_PACKS) {
    assert.ok(
      ["modelled", "shipped_predicate_engine"].includes(p.basis),
      `${p.pack_id} must say what it actually exercised`
    );
  }
  assert.equal(SEAM_PACKS.filter((p) => p.basis === "shipped_predicate_engine").length, 4);
});

test("a pack that THROWS is pack_errored — neither a pass nor a finding", () => {
  // It established nothing. Saying so is more useful than either alternative.
  return runCampaignPack({
    pack_id: "x/throws",
    target_pair: ["a", "b"],
    attack_classes: ["R1"],
    expectation: "…",
    probe() {
      throw new Error("boom");
    },
  }).then((r) => {
    assert.equal(r.outcome, "pack_errored");
    assert.equal(r.is_finding, false);
    assert.equal(r.premise_established, false);
  });
});

test("a violated expectation IS a finding, and the runner keeps going", async () => {
  const r = await runCampaignPack({
    pack_id: "x/accepts",
    target_pair: ["a", "b"],
    attack_classes: ["R5"],
    expectation: "…",
    probe: () => ({ outcome: "unexpectedly_accepted", detail: "d", premise: { p: 1 } }),
  });
  assert.equal(r.is_finding, true);
  for (const o of FINDING_OUTCOMES) assert.ok(CAMPAIGN_OUTCOMES.includes(o));
});

test("a pack naming a class outside the frozen taxonomy throws at run time", async () => {
  await assert.rejects(
    () =>
      runCampaignPack({
        pack_id: "x/bad",
        target_pair: ["a", "b"],
        attack_classes: ["R99"],
        expectation: "…",
        probe: () => ({ outcome: "refused_as_expected", premise: {} }),
      }),
    /not a frozen attack class/
  );
});

test("errored packs land in their OWN denominator, never folded into either column", () => {
  // Otherwise a campaign's ratio improves by breaking more packs.
  const { record } = buildCampaign({
    campaign_id: "c",
    closureDigest: CLOSURE,
    committedClosureDigest: CLOSURE,
    results: [
      {
        pack_id: "a",
        outcome: "refused_as_expected",
        is_finding: false,
        premise_established: true,
      },
      { pack_id: "b", outcome: "pack_errored", is_finding: false, premise_established: false },
    ],
  });
  assert.equal(record.packs_run, 2);
  assert.equal(record.packs_establishing_a_result, 1);
  assert.equal(record.packs_errored, 1);
  assert.ok(!record.summary.includes("1/2 passed"));
});

test("a campaign bound to the wrong closure REFUSES (L2)", () => {
  const r = buildCampaign({
    campaign_id: "c",
    closureDigest: "b".repeat(64),
    committedClosureDigest: CLOSURE,
    results: [],
  });
  assert.equal(r.refused, true);
  assert.match(r.detail, /universe nobody committed/);
});

// ---- historical policy ----

test("reproducible and unreproducible are SEPARATE denominators, never summed", () => {
  const t = tallyOutcomes([
    { outcome: "reproduced" },
    { outcome: "reproduction_failed" },
    { outcome: "environment_unreproducible" },
    { outcome: "script_absent" },
  ]);
  assert.equal(t.reproducible_denominator, 2);
  assert.equal(t.unreproducible_denominator, 2);
  assert.match(t.note, /NEVER summed/);
});

test("environment_unreproducible is NEVER counted as a pass", () => {
  const t = tallyOutcomes([{ outcome: "environment_unreproducible" }]);
  assert.equal(t.reproduced, 0);
  assert.equal(t.reproducible_denominator, 0);
  assert.equal(t.environment_unreproducible, 1);
});

test("step 5 — weaker historical semantics — is its own assertion against a COMMITTED matrix", () => {
  // Gauntlet P2-11: "current tooling accepting weaker historical semantics" has no meaning without
  // a baseline. The matrix IS the baseline; a read outside it is the finding.
  assert.ok(COMPATIBILITY_MATRIX.minimum_schema_version_by_family.identity >= 1);
  const weak = checkWeakerHistoricalSemantics({ family: "identity", historicalVersion: 1 });
  assert.equal(weak.finding, true);
  assert.match(weak.reason, /Strength is not inherited/);
  const ok = checkWeakerHistoricalSemantics({ family: "identity", historicalVersion: 3 });
  assert.equal(ok.finding, false);
});

test("a family outside the committed matrix is itself a finding", () => {
  const r = checkWeakerHistoricalSemantics({ family: "invented", historicalVersion: 9 });
  assert.equal(r.finding, true);
  assert.match(r.reason, /outside the committed matrix/);
});

test("the five tag outcomes are the frozen five", () => {
  assert.deepEqual([...TAG_OUTCOMES].sort(), [
    "environment_unreproducible",
    "reproduced",
    "reproduced_with_diff",
    "reproduction_failed",
    "script_absent",
  ]);
});
