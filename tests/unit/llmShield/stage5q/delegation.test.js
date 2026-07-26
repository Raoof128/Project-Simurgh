// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 7 — delegation validation (spec §2.7, status
// `delegated_to_attacked_caller`).
//
// Delegation is the only coverage status that discharges a member WITHOUT attacking it. That makes
// it the softest of the four, and the place a coverage ratio goes to die: "my callers were
// attacked" is cheap to write, expensive to check, and trivially true when there are no callers.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateDelegation,
  DELEGATION_PROBLEM_KINDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/delegation.mjs";

const S = (pairs) => new Map(Object.entries(pairs));
const C = (pairs) => new Map(Object.entries(pairs).map(([k, v]) => [k, v]));
const members = (...ids) => ids.map((function_id) => ({ function_id }));

test("delegation with EVERY caller attacked_pass is valid", () => {
  const r = validateDelegation({
    members: members("caller", "helper"),
    statuses: S({ caller: "attacked_pass", helper: "delegated_to_attacked_caller" }),
    callers: C({ caller: [], helper: ["caller"] }),
  });
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
});

test("ONE unattacked caller invalidates the delegation — this is not a majority vote", () => {
  // The temptation is to accept "most of my callers were attacked". One unattacked caller is one
  // path into the member that nothing has exercised, and a status is a claim about all paths.
  const r = validateDelegation({
    members: members("good", "bad", "helper"),
    statuses: S({
      good: "attacked_pass",
      bad: "mechanically_unreachable",
      helper: "delegated_to_attacked_caller",
    }),
    callers: C({ good: [], bad: [], helper: ["good", "bad"] }),
  });
  const p = r.problems.find((x) => x.function_id === "helper");
  assert.ok(p);
  assert.equal(p.kind, "unattacked_caller");
  assert.equal(p.caller, "bad");
  assert.equal(p.caller_status, "mechanically_unreachable");
});

test("a member claiming delegation with ZERO named call sites is invalid, not vacuously true", () => {
  // The most dangerous case in the file. "All zero of my callers were attacked" is trivially true,
  // and a checker written as a `.every()` returns true for the empty list without being asked.
  const r = validateDelegation({
    members: members("orphan"),
    statuses: S({ orphan: "delegated_to_attacked_caller" }),
    callers: C({ orphan: [] }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "missing_callsite");
  assert.match(r.problems[0].reason, /vacuous|zero/i);
});

test("a two-node cycle A<->B discharges NOTHING — both are problems", () => {
  const r = validateDelegation({
    members: members("A", "B"),
    statuses: S({ A: "delegated_to_attacked_caller", B: "delegated_to_attacked_caller" }),
    callers: C({ A: ["B"], B: ["A"] }),
  });
  assert.equal(r.ok, false);
  const flagged = r.problems.filter((p) => p.kind === "cycle").map((p) => p.function_id);
  assert.deepEqual(flagged.sort(), ["A", "B"], "mutual delegation discharges neither member");
});

test("a longer cycle A->B->C->A is caught too", () => {
  const r = validateDelegation({
    members: members("A", "B", "C"),
    statuses: S({
      A: "delegated_to_attacked_caller",
      B: "delegated_to_attacked_caller",
      C: "delegated_to_attacked_caller",
    }),
    callers: C({ A: ["B"], B: ["C"], C: ["A"] }),
  });
  const flagged = r.problems.filter((p) => p.kind === "cycle").map((p) => p.function_id);
  assert.deepEqual(flagged.sort(), ["A", "B", "C"]);
  assert.ok(r.problems[0].cycle_path.length >= 3, "the violation names the cycle it found");
});

test("a CHAIN that terminates in attacked_pass is valid — delegation is transitive", () => {
  const r = validateDelegation({
    members: members("root", "mid", "leaf"),
    statuses: S({
      root: "attacked_pass",
      mid: "delegated_to_attacked_caller",
      leaf: "delegated_to_attacked_caller",
    }),
    callers: C({ root: [], mid: ["root"], leaf: ["mid"] }),
  });
  assert.deepEqual(r.problems, []);
});

test("a chain that terminates in a FINDING does not discharge", () => {
  // `finding_frozen` means the attack found something. A caller that failed cannot vouch for the
  // member below it.
  const r = validateDelegation({
    members: members("root", "leaf"),
    statuses: S({ root: "finding_frozen", leaf: "delegated_to_attacked_caller" }),
    callers: C({ root: [], leaf: ["root"] }),
  });
  assert.equal(r.problems[0].kind, "unattacked_caller");
  assert.equal(r.problems[0].caller_status, "finding_frozen");
});

test("an INCOMPLETE caller list cannot support a delegation claim", () => {
  // The census records unresolved call edges rather than dropping them, precisely so this check can
  // exist: a member whose caller list is known to be partial cannot claim that all of its callers
  // were attacked.
  const r = validateDelegation({
    members: members("caller", "helper"),
    statuses: S({ caller: "attacked_pass", helper: "delegated_to_attacked_caller" }),
    callers: C({ caller: [], helper: ["caller"] }),
    unresolvedCallers: C({ helper: ["<computed-member-call>"] }),
  });
  assert.equal(r.ok, false);
  const p = r.problems.find((x) => x.kind === "incomplete_caller_list");
  assert.ok(p, "an unresolved caller means the list is not known to be complete");
  assert.deepEqual(p.unresolved, ["<computed-member-call>"]);
});

test("a status outside the frozen four is rejected, never treated as delegation", () => {
  const r = validateDelegation({
    members: members("x"),
    statuses: S({ x: "probably_fine" }),
    callers: C({ x: [] }),
  });
  assert.equal(r.problems[0].kind, "unknown_status");
});

test("a member with NO status at all is a problem — silence is not coverage", () => {
  const r = validateDelegation({
    members: members("x"),
    statuses: S({}),
    callers: C({ x: [] }),
  });
  assert.equal(r.problems[0].kind, "unknown_status");
});

test("a caller that is not a closure member cannot discharge anything", () => {
  const r = validateDelegation({
    members: members("helper"),
    statuses: S({ helper: "delegated_to_attacked_caller" }),
    callers: C({ helper: ["5a:ghost.mjs:phantom"] }),
  });
  assert.equal(r.problems[0].kind, "unattacked_caller");
  assert.equal(r.problems[0].caller_status, null);
});

test("non-delegating members are not examined for callers", () => {
  // Only `delegated_to_attacked_caller` makes a claim about callers. An `attacked_pass` member with
  // no callers is perfectly ordinary and must not be flagged.
  const r = validateDelegation({
    members: members("a", "b", "c"),
    statuses: S({ a: "attacked_pass", b: "finding_frozen", c: "mechanically_unreachable" }),
    callers: C({ a: [], b: [], c: [] }),
  });
  assert.deepEqual(r.problems, []);
});

test("the problem-kind vocabulary is closed and every kind is reachable by a test above", () => {
  assert.deepEqual([...DELEGATION_PROBLEM_KINDS].sort(), [
    "cycle",
    "incomplete_caller_list",
    "missing_callsite",
    "unattacked_caller",
    "unknown_status",
  ]);
});
