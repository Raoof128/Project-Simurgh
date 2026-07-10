// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { computeTierFacts } from "../../../../tools/simurgh-attestation/stage5h/core/tierLattice.mjs";

const claims = () => validBundle().bundle.claim_inventory.content.claims;
const reproduced = { verdict: "reproduced" };
const matched = { matched: true };

test("CBRN controlled claim with reproduced receipt → controlled/qualified", () => {
  const f = computeTierFacts(claims()[0], { receiptFact: reproduced });
  assert.deepEqual(f, {
    proven_tier: "controlled",
    support_quality: "qualified",
    max_consequence_warranted: "threshold_crossing",
  });
});

test("public claim with matched recompute + empty withheld → public/full", () => {
  const f = computeTierFacts(claims()[1], { recomputeFact: matched });
  assert.equal(f.proven_tier, "public");
  assert.equal(f.support_quality, "full");
});

test("restricted claim → restricted/descriptive/contextual", () => {
  const f = computeTierFacts(claims()[2], {});
  assert.deepEqual(f, {
    proven_tier: "restricted",
    support_quality: "descriptive",
    max_consequence_warranted: "contextual",
  });
});

test("not_reproduced receipt caps at restricted", () => {
  const f = computeTierFacts(claims()[0], { receiptFact: { verdict: "not_reproduced" } });
  assert.equal(f.proven_tier, "restricted");
});

test("receipt absent on a controlled-declared claim → restricted", () => {
  assert.equal(computeTierFacts(claims()[0], {}).proven_tier, "restricted");
});

test("recompute mismatch on public-declared → controlled if receipt, else restricted", () => {
  // no receipt, mismatch → restricted
  assert.equal(
    computeTierFacts(claims()[1], { recomputeFact: { matched: false } }).proven_tier,
    "restricted"
  );
  // with a reproduced receipt but recompute mismatch → controlled (R1)
  assert.equal(
    computeTierFacts(claims()[1], { receiptFact: reproduced, recomputeFact: { matched: false } })
      .proven_tier,
    "controlled"
  );
});

test("nonempty withheld blocks R2 even when recompute matched", () => {
  const c = structuredClone(claims()[1]);
  c.artefact_manifest.withheld = [{ artefact_id: "x" }];
  assert.equal(
    computeTierFacts(c, { recomputeFact: matched, receiptFact: reproduced }).proven_tier,
    "controlled"
  );
});

test("R2 does NOT require a receipt (the public fixture claim proves it)", () => {
  const f = computeTierFacts(claims()[1], { recomputeFact: matched, receiptFact: null });
  assert.equal(f.proven_tier, "public");
});
