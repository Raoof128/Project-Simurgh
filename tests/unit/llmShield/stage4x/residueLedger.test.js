// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR residueLedger (plan Task 6).
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeLedgerFromLiveGate,
  computeLedgerFromSealedOutcomes,
  checkLedgerArithmetic,
  checkOutcomesAgainstGate,
  checkMonotone,
} from "../../../../tools/simurgh-attestation/stage4x/core/residueLedger.mjs";
import { greenCorpus, clone } from "./_corpusHelper.mjs";

test("live-gate and sealed-outcome builders agree on every aggregate", () => {
  const c = greenCorpus();
  const live = computeLedgerFromLiveGate(c);
  const sealed = computeLedgerFromSealedOutcomes(c, live.per_item_outcomes);
  for (const k of [
    "v1",
    "v2",
    "metamorphic_slip_rate_v1",
    "metamorphic_slip_rate_v2",
    "residue_delta",
    "per_family",
    "monotone",
  ])
    assert.deepEqual(sealed[k], live[k], k);
});

test("green ledger: v1 misses all paraphrases, v2 shrinks to the floor", () => {
  const l = computeLedgerFromLiveGate(greenCorpus());
  assert.equal(l.metamorphic_slip_rate_v1, "6/6"); // v1 misses every metamorphic residue
  assert.equal(l.metamorphic_slip_rate_v2, "1/6"); // v2 shrinks it to the irreducible floor
  assert.deepEqual(l.v2.residue_item_ids, ["i5"]); // R′ = the floor
  assert.deepEqual(l.residue_delta.irreducible, ["i5"]);
  assert.deepEqual(l.residue_delta.newly_caught_by_v2, ["i1", "i2", "i3", "i4", "i6"]);
  assert.equal(l.monotone, true);
});

test("178: hand-edited aggregate ≠ arithmetic over sealed outcomes", () => {
  const c = greenCorpus();
  const l = computeLedgerFromLiveGate(c);
  const tampered = clone(l);
  tampered.metamorphic_slip_rate_v2 = "0/6"; // lie: claim v2 catches everything
  const r = checkLedgerArithmetic(c, tampered);
  assert.deepEqual([r.raw, r.reason], [178, "vlr_ledger_mismatch"]);
  assert.equal(checkLedgerArithmetic(c, l), null); // honest ledger passes
});

test("177: sealed outcome diverging from the live gate (audit tier)", () => {
  const c = greenCorpus();
  const l = computeLedgerFromLiveGate(c);
  const swapped = clone(l);
  // Claim i1's paraphrase was CAUGHT by v1 (it is not) — arithmetic stays self-consistent,
  // but the live gate disagrees → 177 (the public-green / audit-red story).
  swapped.per_item_outcomes.find((o) => o.item_id === "i1").residue_v1 = true;
  const r = checkOutcomesAgainstGate(c, swapped);
  assert.deepEqual([r.raw, r.reason], [177, "vlr_gate_recompute_mismatch"]);
  assert.equal(checkOutcomesAgainstGate(c, l), null);
});

test("179: monotonicity recomputed — fires on a broken v2 AND on a lying flag", () => {
  const c = greenCorpus();
  const l = computeLedgerFromLiveGate(c);
  assert.equal(checkMonotone(l), null);

  // v2 drops a v1 catch: residue caught by v1 but not v2.
  const broken = clone(l);
  const o = broken.per_item_outcomes.find((x) => x.item_id === "i1");
  o.residue_v1 = true;
  o.residue_v2 = false;
  assert.equal(checkMonotone(broken).detail, "v2_drops_a_v1_catch");

  // Boolean lie: relation holds but the stored flag says false.
  const lie = clone(l);
  lie.monotone = false;
  assert.equal(checkMonotone(lie).detail, "monotone_flag_lie");
});
