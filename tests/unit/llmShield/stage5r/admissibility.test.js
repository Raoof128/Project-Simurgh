// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 9: frozen §4's seven conditions, and the bound §4.3 left to the plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessFamily,
  admissible,
  spansComparable,
  structurallyComparable,
  SEVEN_CONDITIONS,
  COMPARABILITY_RATIO_BOUND,
} from "../../../../tools/simurgh-attestation/stage5r/core/admissibility.mjs";

const CLOSURE = new Set(["5p:a.mjs:v", "5p:a.mjs:s", "5p:a.mjs:o"]);
const family = { attack_class: "R2", target_security_role: "evidence_emission" };
const obs = (over = {}) => {
  const base = (fid) => ({
    function_id: fid,
    security_role: "evidence_emission",
    premise_recomputed: true,
    restoration_proven: true,
  });
  return {
    vulnerable: { ...base("5p:a.mjs:v"), verdict: "detected" },
    safe: { ...base("5p:a.mjs:s"), verdict: "not_detected" },
    orthogonal: { ...base("5p:a.mjs:o"), verdict: "not_detected" },
    ...over,
  };
};

test("all seven conditions are named, in §4.1's order", () => {
  assert.equal(SEVEN_CONDITIONS.length, 7);
  assert.equal(SEVEN_CONDITIONS[0], "vulnerable_control_detected");
  assert.equal(SEVEN_CONDITIONS.at(-1), "mutation_restored_proven");
});

test("all seven holding is admissible", () => {
  const r = assessFamily({ family, observations: obs(), closure: CLOSURE });
  assert.equal(r.admissible, true);
  assert.deepEqual(r.failed, []);
  assert.equal(r.conditions.length, 7);
});

test("EACH condition falsified in turn yields inadmissible, NAMING the failed condition", () => {
  const breakers = {
    vulnerable_control_detected: obs({
      vulnerable: { ...obs().vulnerable, verdict: "not_detected" },
    }),
    safe_control_not_detected: obs({ safe: { ...obs().safe, verdict: "detected" } }),
    orthogonal_failure_not_misclassified: obs({
      orthogonal: { ...obs().orthogonal, verdict: "detected" },
    }),
    premises_recomputed: obs({ safe: { ...obs().safe, premise_recomputed: false } }),
    target_role_matches_claimed_applicability: obs({
      safe: { ...obs().safe, security_role: "trust_decision" },
    }),
    results_bind_to_inherited_closure: obs({
      safe: { ...obs().safe, function_id: "5x:not:inherited" },
    }),
    mutation_restored_proven: obs({
      orthogonal: { ...obs().orthogonal, restoration_proven: false },
    }),
  };
  for (const [id, observations] of Object.entries(breakers)) {
    const r = assessFamily({ family, observations, closure: CLOSURE });
    assert.equal(r.admissible, false, id);
    assert.deepEqual(r.failed, [id], `expected exactly ${id} to fail, got ${r.failed.join(",")}`);
  }
  assert.deepEqual(Object.keys(breakers).sort(), [...SEVEN_CONDITIONS].sort());
});

test("six of seven is inadmissible — there is no partial credit", () => {
  const r = assessFamily({
    family,
    observations: obs({ safe: { ...obs().safe, restoration_proven: false } }),
    closure: CLOSURE,
  });
  assert.equal(r.conditions.filter((c) => c.ok).length, 6);
  assert.equal(r.admissible, false);
});

// ---- the bound -------------------------------------------------------------------------------------

test("the comparability bound is 3 and is evaluated WITHOUT division", () => {
  assert.equal(COMPARABILITY_RATIO_BOUND, 3);
  assert.equal(spansComparable(300, 100).ok, true, "300:100 is exactly the bound");
  assert.equal(spansComparable(301, 100).ok, false, "301:100 is over it");
  // The case integer division gets wrong: floor(399/101) === 3, but the true ratio is 3.95.
  assert.equal(Math.floor(399 / 101), 3);
  assert.equal(
    spansComparable(399, 101).ok,
    false,
    "cross-multiplication catches what floor() misses"
  );
});

test("a zero-length span is refused rather than treated as equal", () => {
  assert.equal(spansComparable(0, 100).ok, false);
  assert.match(spansComparable(0, 100).reason, /absent/);
  assert.equal(spansComparable(100.5, 100).ok, false);
});

test("the bound is symmetric", () => {
  assert.equal(spansComparable(100, 300).ok, true);
  assert.equal(spansComparable(100, 301).ok, false);
});

// ---- structural comparability -----------------------------------------------------------------------

const pair = (over = {}) => ({
  vulnerable: {
    category: "exported_function",
    security_role: "schema_gate",
    symbol: "check",
    arity: 2,
    span_bytes: 300,
  },
  safe: {
    category: "exported_function",
    security_role: "schema_gate",
    symbol: "check",
    arity: 2,
    span_bytes: 290,
    exercises_detector_signal_path: true,
  },
  ...over,
});

test("a structurally matched pair is comparable", () => {
  assert.equal(structurallyComparable(pair()).ok, true);
});

test("a different category, role, or neither-symbol-nor-arity is refused", () => {
  assert.match(
    structurallyComparable(pair({ safe: { ...pair().safe, category: "exported_constant" } }))
      .reason,
    /category/
  );
  assert.match(
    structurallyComparable(pair({ safe: { ...pair().safe, security_role: "trust_decision" } }))
      .reason,
    /security_role/
  );
  assert.match(
    structurallyComparable(pair({ safe: { ...pair().safe, symbol: "other", arity: 5 } })).reason,
    /neither the exported symbol nor the call arity/
  );
});

test("matching arity alone is enough, and so is matching symbol alone", () => {
  assert.equal(
    structurallyComparable(pair({ safe: { ...pair().safe, symbol: "other" } })).ok,
    true
  );
  assert.equal(structurallyComparable(pair({ safe: { ...pair().safe, arity: 9 } })).ok, true);
});

test("generated code is refused as a control", () => {
  assert.match(
    structurallyComparable(pair({ safe: { ...pair().safe, generated: true } })).reason,
    /generated/
  );
});

test("a STUB safe control is refused even though everything else matches", () => {
  const r = structurallyComparable(
    pair({ safe: { ...pair().safe, exercises_detector_signal_path: false } })
  );
  assert.equal(r.ok, false);
  assert.match(r.reason, /stub|wrong reason/);
});

// ---- the blade ---------------------------------------------------------------------------------------

test("§4.2: admissibility does NOT promote from one role to another", () => {
  const verdicts = [
    { attack_class: "R4", target_security_role: "trust_decision", admissible: true },
  ];
  assert.equal(admissible(verdicts, "R4", "trust_decision"), true);
  assert.equal(admissible(verdicts, "R4", "completeness_claim"), false, "this is the blade");
  assert.equal(admissible(verdicts, "R5", "trust_decision"), false);
});

test("an inadmissible family in one role does not taint an admissible one in another", () => {
  const verdicts = [
    { attack_class: "R4", target_security_role: "trust_decision", admissible: false },
    { attack_class: "R4", target_security_role: "canonicalisation", admissible: true },
  ];
  assert.equal(admissible(verdicts, "R4", "trust_decision"), false);
  assert.equal(admissible(verdicts, "R4", "canonicalisation"), true);
});
