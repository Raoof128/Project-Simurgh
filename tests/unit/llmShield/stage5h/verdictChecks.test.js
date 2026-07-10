// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — verdict checks 311/312/313/314 (Tasks 14–17) + buildVerdictTable.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, resign } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { buildVerdictTable } from "../../../../tools/simurgh-attestation/stage5h/core/tierLattice.mjs";
import { checkTierOverclaim } from "../../../../tools/simurgh-attestation/stage5h/core/tierOverclaim.mjs";
import { checkInversion } from "../../../../tools/simurgh-attestation/stage5h/core/inversion.mjs";
import { checkCensus } from "../../../../tools/simurgh-attestation/stage5h/core/census.mjs";
import { evaluatePolicy } from "../../../../tools/simurgh-attestation/stage5h/core/policy.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";

const clone = (fx) => ({ ...fx, bundle: structuredClone(fx.bundle) });

test("buildVerdictTable reproduces the committed table", () => {
  const fx = validBundle();
  const recomputed = buildVerdictTable(ctxFor(fx));
  assert.equal(canonicalJson(recomputed), canonicalJson(fx.bundle.verdict_table));
});

test("311 valid passes; declared controlled + not_reproduced → 311 (FrontierMath leg 1)", () => {
  const fx = validBundle();
  assert.deepEqual(checkTierOverclaim(ctxFor(fx)), { ok: true });
  const f = clone(fx);
  f.bundle.review_receipts[0].content.verdict = "not_reproduced";
  resign(f.bundle, fx.keys);
  const r = checkTierOverclaim(ctxFor(f));
  assert.equal(r.raw, 311);
  assert.equal(r.claim_id, "frontier7b-cbrn-threshold");
});

test("311 public declared + recompute mismatch → 311 (honest output mismatch)", () => {
  const fx = validBundle();
  const f = clone(fx);
  const rr = { "frontier7b-harmbench-public": { matched: false } };
  assert.equal(
    checkTierOverclaim(ctxFor(f, { recomputeResult: rr })).claim_id,
    "frontier7b-harmbench-public"
  );
});

test("312 both boundary halves: C2-on-R0 and C1-on-R0 invert", () => {
  const fx = validBundle();
  assert.deepEqual(checkInversion(ctxFor(fx)), { ok: true });
  // C2 on R0: monitoring claim declared threshold_crossing but stays restricted
  const f1 = clone(fx);
  f1.bundle.claim_inventory.content.claims[2].declared_consequence = "threshold_crossing";
  resign(f1.bundle, fx.keys);
  assert.equal(checkInversion(ctxFor(f1)).raw, 312);
  // C1 on R0: monitoring declared supporting → still inverts (restricted warrants only contextual)
  const f2 = clone(fx);
  f2.bundle.claim_inventory.content.claims[2].declared_consequence = "supporting";
  resign(f2.bundle, fx.keys);
  assert.equal(checkInversion(ctxFor(f2)).reason, "evidential_inversion");
});

test("312 C2-on-R1 is fine (qualified support suffices structurally)", () => {
  const fx = validBundle();
  // CBRN is C2 declared, proven controlled (R1) → warrant threshold_crossing → OK
  assert.deepEqual(checkInversion(ctxFor(fx)), { ok: true });
});

test("312 FrontierMath leg 3: restricted+C1+failed receipt → 312", () => {
  const fx = validBundle();
  const f = clone(fx);
  // CBRN claim: declare restricted + supporting, fail the receipt → proven restricted, C1 inverts
  f.bundle.claim_inventory.content.claims[0].declared_tier = "restricted";
  f.bundle.claim_inventory.content.claims[0].declared_consequence = "supporting";
  f.bundle.claim_inventory.content.claims[0].restriction = { reason: "x", right_scaling_note: "y" };
  f.bundle.review_receipts[0].content.verdict = "not_reproduced";
  resign(f.bundle, fx.keys);
  assert.equal(checkInversion(ctxFor(f)).raw, 312);
});

test("313 census: bijection, artefact digests, committed-table equality", () => {
  const fx = validBundle();
  assert.deepEqual(checkCensus(ctxFor(fx, { tier: "audit" })), { ok: true });
  // extra verdict row
  const f1 = clone(fx);
  f1.bundle.verdict_table.push({ claim_id: "ghost", proven_tier: "public" });
  assert.equal(checkCensus(ctxFor(f1)).reason, "verdict_table_bijection");
  // committed table drift (edit a proven_tier the attestation still covers via 301 only)
  const f2 = clone(fx);
  f2.bundle.verdict_table[0].proven_tier = "public";
  assert.equal(checkCensus(ctxFor(f2)).reason, "verdict_table_mismatch");
  // artefact census mismatch
  const f3 = clone(fx);
  const arte = structuredClone(fx.artefacts);
  arte["eval-results"].rows[0].value = "0.10";
  assert.equal(checkCensus(ctxFor(f3, { artefactBytes: arte })).reason, "artefact_census_mismatch");
});

test("314 default policy is a no-op; strict floor rejects R1 CBRN", () => {
  const fx = validBundle();
  assert.deepEqual(evaluatePolicy(ctxFor(fx)), { ok: true });
  const strict = {
    min_tier_for: {
      contextual: "restricted",
      supporting: "controlled",
      threshold_crossing: "public",
    },
  };
  const r = evaluatePolicy(ctxFor(fx), strict);
  assert.equal(r.raw, 314);
  assert.equal(r.claim_id, "frontier7b-cbrn-threshold");
});
