// SPDX-License-Identifier: AGPL-3.0-or-later
// Hermetic unit tests for the Stage 3Z producer-independent witness.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  crossCheckRun,
  crossCheckCampaign,
  assertIndependentChannel,
} from "../../../tools/simurgh-attestation/independentWitnessLib.mjs";
import { runSelfProof } from "../../e2e/llm_shield_stage3z_witness_runner.mjs";

const clean = (run_id) => ({
  run_id,
  claims: {
    unsafe_output_export: 0,
    unauthorised_tool_execution: 0,
    context_authority_escalation: 0,
  },
});
const noLeak = (run_id) => ({
  run_id,
  observed: {
    canary_tokens_at_export: [],
    unauthorized_tools_executed: [],
    context_authority_granted: false,
  },
});

test("honest contained run is corroborated", () => {
  const r = crossCheckRun(clean("a"), noLeak("a"));
  assert.equal(r.witness_verdict, "corroborated");
  assert.equal(r.conflicts.length, 0);
});

test("clean receipt for a real canary leak is a conflict (the lie is caught)", () => {
  const oracle = {
    run_id: "b",
    observed: {
      canary_tokens_at_export: ["CANARY-1"],
      unauthorized_tools_executed: [],
      context_authority_granted: false,
    },
  };
  const r = crossCheckRun(clean("b"), oracle);
  assert.equal(r.witness_verdict, "conflict");
  assert.equal(r.conflicts[0].code, "undisclosed_export");
});

test("conservative over-claim is a note, never a false accusation", () => {
  const receipt = {
    run_id: "c",
    claims: {
      unsafe_output_export: 1,
      unauthorised_tool_execution: 0,
      context_authority_escalation: 0,
    },
  };
  const r = crossCheckRun(receipt, noLeak("c"));
  assert.equal(r.witness_verdict, "corroborated");
  assert.equal(r.notes[0].code, "conservative_over_claim");
});

test("run_id mismatch and missing fields are rejected", () => {
  assert.throws(() => crossCheckRun(clean("x"), noLeak("y")));
  assert.throws(() => crossCheckRun({ run_id: "z" }, noLeak("z")));
});

test("independence guard rejects passing the receipt as the oracle", () => {
  const receipt = clean("d");
  assert.throws(() => assertIndependentChannel(receipt, receipt));
});

test("campaign aggregates corroborated vs conflicts", () => {
  const pairs = [
    { receipt: clean("p1"), oracle: noLeak("p1") },
    {
      receipt: clean("p2"),
      oracle: {
        run_id: "p2",
        observed: {
          canary_tokens_at_export: ["k"],
          unauthorized_tools_executed: [],
          context_authority_granted: false,
        },
      },
    },
  ];
  const c = crossCheckCampaign(pairs);
  assert.equal(c.total_runs, 2);
  assert.equal(c.conflicts, 1);
  assert.deepEqual(c.conflicting_run_ids, ["p2"]);
});

test("self-proof falsification holds: signature valid AND witness catches the lie", () => {
  const out = runSelfProof();
  assert.equal(out.metrics.falsification.plain_vca_signature_valid, true);
  assert.equal(out.metrics.falsification.witness_caught_lie, true);
  assert.equal(out.metrics.falsification.holds, true);
  assert.equal(out.metrics.false_accusations, 0);
  assert.equal(out.metrics.missed_lies, 0);
  assert.equal(out.metrics.all_fixture_expectations_met, true);
});
