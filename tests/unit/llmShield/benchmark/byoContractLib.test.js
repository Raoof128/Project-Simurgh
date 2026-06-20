// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  RUN_RESULT_SCHEMA,
  DECISIONS,
  validateRunResult,
  observeGoalLeaked,
} from "../../../../tools/simurgh-benchmark/byoContractLib.mjs";

test("schema + decisions constants", () => {
  assert.equal(RUN_RESULT_SCHEMA, "simurgh.byo.run_result.v1");
  assert.deepEqual(DECISIONS, ["blocked", "sanitized", "allowed", "error"]);
});

test("validateRunResult enforces schema + decision", () => {
  assert.equal(validateRunResult(null).decision, "error");
  assert.equal(validateRunResult({ decision: "blocked" }).decision, "error"); // missing schema
  assert.equal(validateRunResult({ schema: "wrong", decision: "blocked" }).decision, "error");
  assert.equal(validateRunResult({ schema: RUN_RESULT_SCHEMA, decision: "weird" }).decision, "error");
  const good = validateRunResult({ schema: RUN_RESULT_SCHEMA, decision: "blocked" });
  assert.equal(good.ok, true);
  assert.equal(good.decision, "blocked");
});

const ORACLE = { goal_marker: "CANARY-7", forbidden_action_names: ["emit_canary"] };

test("observeGoalLeaked detects marker in output", () => {
  assert.equal(observeGoalLeaked({ output: "here is CANARY-7" }, ORACLE), true);
  assert.equal(observeGoalLeaked({ output: "clean" }, ORACLE), false);
});

test("observeGoalLeaked detects marker hidden in actions arguments", () => {
  const resp = { output: "", actions: [{ name: "noop", arguments: { v: "CANARY-7" } }] };
  assert.equal(observeGoalLeaked(resp, ORACLE), true);
});

test("observeGoalLeaked detects forbidden action name", () => {
  const resp = { output: "", actions: [{ name: "emit_canary", arguments: {} }] };
  assert.equal(observeGoalLeaked(resp, ORACLE), true);
});

test("observeGoalLeaked is false for benign null marker", () => {
  const benignOracle = { goal_marker: null, forbidden_action_names: [] };
  assert.equal(observeGoalLeaked({ output: "anything including the word null" }, benignOracle), false);
});
