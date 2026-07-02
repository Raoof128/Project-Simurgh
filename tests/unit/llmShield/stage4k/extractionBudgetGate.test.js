// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { SIGNAL_CLASS_WEIGHTS } from "../../../../tools/simurgh-attestation/stage4k/constants.mjs";
import { checkBudgets } from "../../../../tools/simurgh-attestation/stage4k/extractionBudgetGate.mjs";
import {
  buildLedger,
  consumerIdDigest,
} from "../../../../tools/simurgh-attestation/stage4k/extractionLedger.mjs";

const ev = (over = {}) => ({
  event_id: "ev_001",
  consumer_id: "consumer_alpha",
  session_id: "session_a",
  window: "2026-07",
  signal_class: "final_answer",
  response_id_digest: `sha256:${"a".repeat(64)}`,
  ...over,
});
const policy = (budgets) => ({
  schema: "simurgh.eba.budget-policy.v1",
  window: "2026-07",
  class_weights: { ...SIGNAL_CLASS_WEIGHTS },
  budgets,
});
const alpha = consumerIdDigest("consumer_alpha");

test("under budget passes with rawCode 0", () => {
  const ledger = buildLedger([ev()]); // weighted_total = 1
  assert.deepEqual(checkBudgets(ledger, policy({ [alpha]: 5 })), {
    ok: true,
    rawCode: 0,
    reason: null,
    offending: [],
  });
});

test("boundary weighted_total === B passes (budget is inclusive)", () => {
  const ledger = buildLedger([ev()]); // weighted_total = 1
  assert.equal(checkBudgets(ledger, policy({ [alpha]: 1 })).ok, true);
});

test("over budget fails with rawCode 30 and names the offender", () => {
  const ledger = buildLedger([
    ev({ event_id: "ev_1", signal_class: "reward_like_judgment" }), // 4 > 3
  ]);
  const r = checkBudgets(ledger, policy({ [alpha]: 3 }));
  assert.equal(r.ok, false);
  assert.equal(r.rawCode, 30);
  assert.equal(r.reason, "extraction_budget_exceeded");
  assert.deepEqual(r.offending, [alpha]);
});

test("missing budget for a consumer fails closed with 29, never a silent pass", () => {
  const ledger = buildLedger([ev()]);
  const r = checkBudgets(ledger, policy({}));
  assert.equal(r.rawCode, 29);
  assert.equal(r.reason, "missing_budget_for_consumer");
});

test("declared weights that drift from the frozen constants fail closed with 29", () => {
  const ledger = buildLedger([ev()]);
  const p = policy({ [alpha]: 5 });
  p.class_weights.reasoning_trace = 1; // producer tries to cheapen reasoning traces
  const r = checkBudgets(ledger, p);
  assert.equal(r.rawCode, 29);
  assert.equal(r.reason, "weights_mismatch");
});

test("wrong policy schema fails closed with 29", () => {
  const ledger = buildLedger([ev()]);
  const p = policy({ [alpha]: 5 });
  p.schema = "simurgh.eba.budget-policy.v2";
  assert.equal(checkBudgets(ledger, p).rawCode, 29);
});
