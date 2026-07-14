// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — Stephan census (I-A), double-finalisation (I-D), oversight projections (I-E).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stephanCensus,
  doubleFinalisations,
} from "../../../../tools/simurgh-attestation/stage5n/node/census.mjs";
import { oversightProjections } from "../../../../tools/simurgh-attestation/stage5n/node/projections.mjs";

test("stephanCensus: max provable concurrency per signer over overlapping busy windows", () => {
  const items = [
    { signer_fpr: "A", start_upper_ms: 0, end_lower_ms: 100 },
    { signer_fpr: "A", start_upper_ms: 50, end_lower_ms: 150 }, // overlaps the first
    { signer_fpr: "A", start_upper_ms: 60, end_lower_ms: 70 }, // overlaps both -> 3 concurrent
    { signer_fpr: "B", start_upper_ms: 0, end_lower_ms: 10 },
  ];
  const r = stephanCensus(items);
  assert.equal(r.per_signer.A.max_provable_concurrency, 3);
  assert.equal(r.per_signer.A.count, 3);
  assert.equal(r.per_signer.B.max_provable_concurrency, 1);
  assert.match(r.non_claim, /not inattention/);
});

test("stephanCensus: touching windows do NOT count as overlap", () => {
  const items = [
    { signer_fpr: "A", start_upper_ms: 0, end_lower_ms: 100 },
    { signer_fpr: "A", start_upper_ms: 100, end_lower_ms: 200 }, // touches at 100 only
  ];
  assert.equal(stephanCensus(items).per_signer.A.max_provable_concurrency, 1);
});

test("stephanCensus: an inverted window (start_upper > end_lower) has no provable busy interval", () => {
  const items = [{ signer_fpr: "A", start_upper_ms: 100, end_lower_ms: 50 }];
  assert.equal(stephanCensus(items).per_signer.A, undefined);
});

test("doubleFinalisations: same slot + differing decision → flagged; same decision → not", () => {
  const common = {
    run_id: "r",
    D_in: "a".repeat(64),
    delay_policy_digest: "b".repeat(64),
    decision_slot_id: "s1",
  };
  const flaggedInput = [
    { ...common, decision_digest: "1".repeat(64) },
    { ...common, decision_digest: "2".repeat(64) },
  ];
  assert.equal(doubleFinalisations(flaggedInput).flags.length, 1);
  const sameDecision = [
    { ...common, decision_digest: "1".repeat(64) },
    { ...common, decision_digest: "1".repeat(64) },
  ];
  assert.equal(doubleFinalisations(sameDecision).flags.length, 0);
  // A different slot is not a double-finalisation.
  const otherSlot = [
    { ...common, decision_digest: "1".repeat(64) },
    { ...common, decision_slot_id: "s2", decision_digest: "2".repeat(64) },
  ];
  assert.equal(doubleFinalisations(otherSlot).flags.length, 0);
});

test("oversightProjections: three shapes, commitment-time labels, non-claims present", () => {
  const p = oversightProjections({
    run_id: "r",
    D_out: "d".repeat(64),
    start_genTime_ms: 1000,
    end_genTime_ms: 91000,
    elapsed_lower_bound_ms: 90000,
  });
  assert.ok(p.art14_oversight_record && p.activity_feed_record && p.art12_log_record);
  assert.equal(p.art12_log_record.use_period.start, 1000);
  assert.equal(p.art14_oversight_record.commitment_finalisation_time, 91000);
  for (const rec of Object.values(p))
    assert.match(rec.non_claim, /not a claim of Art-12\/Art-14 compliance/);
});
