// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — shadow replay over caught regions (plan Task 6). Applicable-only
// denominator; slips via the REAL gates run on the variant as a whole body (P0-1);
// unit = caught region, not a bare token (P1-3).
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeShadow,
  aggregateShadow,
  checkShadowReplay,
} from "../../../../tools/simurgh-attestation/stage4y/core/shadow.mjs";
import { MR_IDS } from "../../../../tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs";

test("computeShadow returns one record per MR; no-op transforms are applicable:false", () => {
  const recs = computeShadow("we retained 42 of the accounts");
  assert.equal(recs.length, MR_IDS.length);
  assert.ok(
    recs.some((r) => r.applicable === true),
    "at least one transform applies"
  );
  assert.ok(
    recs.some((r) => r.applicable === false),
    "a sentence-designed no-op is inapplicable"
  );
  for (const r of recs) {
    assert.ok(MR_IDS.includes(r.mr_id));
    if (r.applicable) {
      assert.match(r.variant_digest, /^sha256:[0-9a-f]{64}$/);
      assert.equal(typeof r.slips_v1, "boolean");
      assert.equal(typeof r.slips_v2, "boolean");
    }
  }
});

test("slips computed via the real gates over the variant as a whole body", () => {
  // "seven of the users" → floor MR drops "seven of " → "the users" (no v1/v2 token) → slips both.
  const recs = computeShadow("seven of the users churned");
  const floor = recs.find((r) => r.mr_id === "true_semantic_paraphrase");
  assert.ok(floor.applicable, "floor transform applied");
  assert.equal(floor.slips_v1, true, "quantity dropped → v1 no longer fires");
});

test("antitone at the data level: slips_v2 implies slips_v1 (v2 ⊇ v1 catch)", () => {
  for (const body of [
    "seven of the users churned",
    "we retained 42 of the accounts",
    "all 1234 rows",
  ]) {
    for (const r of computeShadow(body))
      if (r.applicable && r.slips_v2) assert.ok(r.slips_v1, `antitone on ${body}/${r.mr_id}`);
  }
});

test("aggregateShadow counts slips over APPLICABLE variants only (no-ops can't pad A)", () => {
  const regions = ["seven of the users churned", "we retained 42 of the accounts"];
  const per = regions.map(computeShadow);
  const agg = aggregateShadow(per);
  assert.equal(agg.n_caught_regions, 2);
  const applicable = per.flat().filter((r) => r.applicable).length;
  assert.equal(agg.a_applicable_variants, applicable);
  assert.ok(agg.k_slip_v1 <= agg.a_applicable_variants);
  assert.ok(agg.k_slip_v2 <= agg.k_slip_v1 + 0 + agg.a_applicable_variants); // sane bound
});

test("checkShadowReplay: sealed records that recompute cleanly pass; a tamper fails 187", () => {
  const region = "we retained 42 of the accounts";
  const sealed = { region_text: region, records: computeShadow(region) };
  assert.equal(checkShadowReplay([sealed]), null);

  const tampered = structuredClone(sealed);
  const app = tampered.records.find((r) => r.applicable);
  app.slips_v1 = !app.slips_v1; // lie about the outcome
  const r = checkShadowReplay([tampered]);
  assert.equal(r.raw, 187);
  assert.equal(r.reason, "vdr_shadow_replay_mismatch");
});

test("checkShadowReplay: a forged variant_digest fails 187", () => {
  const region = "we retained 42 of the accounts";
  const sealed = { region_text: region, records: computeShadow(region) };
  const app = sealed.records.find((r) => r.applicable);
  app.variant_digest = "sha256:" + "0".repeat(64);
  assert.equal(checkShadowReplay([sealed]).raw, 187);
});
