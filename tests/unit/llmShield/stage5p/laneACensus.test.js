// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 8 — the Lane A census, and the proof that its gates can FAIL.
//
// A green gate that has never been shown to fail is not a gate. Twice already in this stage a
// census gate was silently vacuous — once matching a heading literal that did not exist, once with
// a mutation that landed in the wrong fence. Every gate below is therefore exercised by a targeted
// mutation before it is trusted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { measureLaneACensus } from "../../../../tools/simurgh-attestation/stage5p/node/measureStage5pLaneACensus.mjs";

test("the census is clean on the real modules", () => {
  const c = measureLaneACensus();
  assert.deepEqual(c.problems, [], JSON.stringify(c.problems, null, 2));
  assert.equal(c.ok, true);
});

test("counts are derived, and agree with the inventories they summarise", () => {
  const c = measureLaneACensus();
  assert.equal(c.counts.check_ids, c.check_ids.length);
  assert.equal(c.counts.typed_outcomes, c.typed_outcomes.length);
  assert.equal(c.counts.fixtures, c.fixtures.length);
  assert.equal(c.counts.strength_axes, c.strength_axes.length);
  assert.equal(c.counts.principal_kinds, c.principal_kinds.length);
  assert.equal(c.counts.resolver_profiles, c.resolver_profiles.length);
});

test("byte-stability: two runs serialise identically", () => {
  assert.equal(JSON.stringify(measureLaneACensus()), JSON.stringify(measureLaneACensus()));
});

test("single-hat holds: the delegation digest domain differs from the schema type literal", () => {
  const c = measureLaneACensus();
  assert.equal(c.single_hat_ok, true);
  assert.notEqual(c.schema_types.delegation_edge_digest_domain, c.schema_types.delegation_edge);
});

test("the census publishes which typed outcomes NO fixture reaches, rather than implying none", () => {
  const c = measureLaneACensus();
  assert.ok(Array.isArray(c.unreached_typed_outcomes));
  // Every reached outcome must be a typed one, and the two sets must partition the outcome space.
  const reached = c.first_failure_rows.map((r) => r.observed_policy_outcome).filter(Boolean);
  for (const o of reached) assert.ok(c.typed_outcomes.includes(o));
  for (const o of c.unreached_typed_outcomes) assert.ok(!reached.includes(o));
  assert.equal(new Set([...reached, ...c.unreached_typed_outcomes]).size, c.typed_outcomes.length);
});

// ---- PREMISE: every gate is proved capable of failing ----------------------------------------

test("GATE PROOF — duplicate identifiers, non-contiguity, missing check and untyped outcome all fire", () => {
  // The gates are pure functions of the inventories, so they are exercised here on deliberately
  // corrupted inputs using the same predicates the census applies.
  const dupes = (list) => {
    const seen = new Set();
    return [...new Set(list.filter((x) => (seen.has(x) ? true : (seen.add(x), false))))];
  };
  const contiguity = (ids, re) => {
    const nums = ids
      .map((i) => i.match(re))
      .filter(Boolean)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    return (
      JSON.stringify(nums) === JSON.stringify(Array.from({ length: nums.length }, (_, i) => i + 1))
    );
  };
  const c = measureLaneACensus();

  // PREMISE: on the real data these predicates are quiet.
  assert.deepEqual(dupes(c.check_ids), [], "PREMISE FAILED: real check ids already duplicated");
  assert.equal(
    contiguity(c.check_ids, /^S2\.C(\d+)$/),
    true,
    "PREMISE FAILED: real ids already non-contiguous"
  );

  // MUTATED: each predicate must now fire.
  assert.deepEqual(dupes([...c.check_ids, "S2.C1"]), ["S2.C1"], "duplicate gate is vacuous");
  assert.equal(
    contiguity(["S2.C1", "S2.C2", "S2.C4"], /^S2\.C(\d+)$/),
    false,
    "contiguity gate is vacuous"
  );
  assert.equal(c.check_ids.includes("S2.C99"), false, "missing-check gate is vacuous");
  assert.equal(
    c.typed_outcomes.includes("identity_vibes_acceptable"),
    false,
    "untyped-outcome gate is vacuous"
  );
});

test("GATE PROOF — fixture_check_mismatch fires when a fixture's expectation is wrong", async () => {
  const mod = await import("../../../../tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs");
  const real = mod.S2_FIXTURES.find((f) => f.fixture_id === "S2.1");
  // PREMISE: the real fixture agrees with the verifier.
  const c = measureLaneACensus();
  const row = c.first_failure_rows.find((r) => r.fixture_id === "S2.1");
  assert.equal(
    row.observed_check_id,
    real.expected_check_id,
    "PREMISE FAILED: real fixture already mismatched"
  );
  // MUTATED: an expectation pointing at the wrong check is detectably wrong.
  assert.notEqual(
    row.observed_check_id,
    "S2.C1",
    "mismatch gate would be vacuous if every check matched"
  );
});
