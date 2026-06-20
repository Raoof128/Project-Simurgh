// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3L_FAMILIES,
  STAGE3L_CASE_MODES,
  EXPECTED_STAGE3L_COUNTS,
  validateStage3lCorpus,
  buildStage3lCorpus,
  evaluateStage3lCase,
  enforceInputMissValidity,
  enforceDirectInputValidity,
  computeStage3lMetrics,
  enforceStage3lHardGates,
  buildStage3lManifest,
  buildBoundaryBreakdown,
  computeEvidenceLeakageFindings,
} from "../../e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

function evalCorpus() {
  return buildStage3lCorpus().map((fixture) => ({ fixture, result: evaluateStage3lCase(fixture) }));
}

test("taxonomy enumerates 6 families and 3 case modes", () => {
  assert.equal(STAGE3L_FAMILIES.length, 6);
  assert.deepEqual(STAGE3L_CASE_MODES, [
    "input_miss_downstream",
    "direct_input_attack",
    "benign_hard_negative",
  ]);
});

test("expected counts sum to 180 with 120/30/30 split", () => {
  let im = 0;
  let di = 0;
  let bn = 0;
  for (const m of Object.values(EXPECTED_STAGE3L_COUNTS)) {
    im += m.input_miss_downstream;
    di += m.direct_input_attack;
    bn += m.benign_hard_negative;
  }
  assert.deepEqual([im, di, bn], [120, 30, 30]);
});

test("validateStage3lCorpus rejects an empty corpus", () => {
  assert.equal(validateStage3lCorpus([], { enforceExactCounts: true }).ok, false);
});

test("buildStage3lCorpus emits a valid, deterministic 180-case corpus", () => {
  const corpus = buildStage3lCorpus();
  assert.equal(corpus.length, 180);
  const res = validateStage3lCorpus(corpus, { enforceExactCounts: true });
  assert.deepEqual(res.errors, []);
  assert.equal(res.ok, true);
  assert.deepEqual(buildStage3lCorpus(), corpus);
});

test("every input_miss case passes input and is contained by its intended downstream boundary", () => {
  for (const fx of buildStage3lCorpus().filter((f) => f.case_mode === "input_miss_downstream")) {
    const r = evaluateStage3lCase(fx);
    assert.equal(r.input_verdict, "safe", `${fx.case_id} input must pass`);
    assert.notEqual(r.boundary, "input_firewall", `${fx.case_id} not input-firewall`);
    assert.ok(["context_guard", "tool_gate", "output_firewall"].includes(r.boundary));
    assert.equal(r.boundary, fx.expected_containment_boundary, `${fx.case_id} intended boundary`);
  }
});

test("every direct_input case is blocked at the input firewall", () => {
  for (const fx of buildStage3lCorpus().filter((f) => f.case_mode === "direct_input_attack")) {
    const r = evaluateStage3lCase(fx);
    assert.equal(r.input_verdict, "blocked", `${fx.case_id} must be blocked`);
    assert.equal(r.boundary, "input_firewall");
  }
});

test("benign hard-negatives are allowed without over-defence", () => {
  for (const fx of buildStage3lCorpus().filter((f) => f.case_mode === "benign_hard_negative")) {
    const r = evaluateStage3lCase(fx);
    assert.equal(r.input_verdict, "safe");
    assert.equal(r.boundary, "allowed", `${fx.case_id} must not be over-defended`);
    assert.equal(r.contained, true);
  }
});

test("validity gates and hard gates pass over the generated corpus", () => {
  const evaluations = evalCorpus();
  assert.deepEqual(enforceInputMissValidity(evaluations).errors, []);
  assert.deepEqual(enforceDirectInputValidity(evaluations).errors, []);
  const metrics = computeStage3lMetrics(evaluations);
  assert.equal(metrics.input_miss_input_passed, 120);
  assert.equal(metrics.input_miss_contained_by_input_firewall, 0);
  assert.equal(metrics.input_miss_downstream_contained, 120);
  assert.equal(metrics.direct_input_blocked, 30);
  assert.equal(metrics.direct_input_contained_by_input_firewall, 30);
  assert.equal(metrics.case_expectation_mismatches, 0);
  assert.equal(metrics.malicious_targeted_asr, 0);
  assert.equal(metrics.malicious_total, 150);
  assert.equal(metrics.benign_hard_negative_passed, 30);
  assert.equal(metrics.receipt_coverage, 180);
  assert.equal(metrics.audit_chain_valid, 180);
  const gate = enforceStage3lHardGates(metrics);
  assert.deepEqual(gate.errors, []);
  assert.equal(gate.ok, true);
});

test("boundary breakdown distributes across downstream boundaries", () => {
  const breakdown = buildBoundaryBreakdown(evalCorpus());
  assert.equal(breakdown.boundary_distribution.context_guard, 72); // 3 families x 24
  assert.equal(breakdown.boundary_distribution.tool_gate, 24);
  assert.equal(breakdown.boundary_distribution.output_firewall, 24);
  assert.equal(breakdown.boundary_distribution.input_firewall, 30);
  assert.equal(breakdown.boundary_distribution.allowed, 30);
});

test("manifest stores only hashes and metadata, never raw payloads", () => {
  const manifest = buildStage3lManifest(buildStage3lCorpus());
  assert.equal(manifest.total_cases, 180);
  const serialised = JSON.stringify(manifest);
  assert.equal(serialised.includes("REDACTED-SYNTHETIC"), false);
  assert.equal(serialised.includes("shell_command"), false);
  for (const fx of manifest.fixtures) assert.ok(fx.user_task_hash.length > 0);
});

test("computeEvidenceLeakageFindings flags forbidden tokens", () => {
  const clean = [["metrics.json", '{"receipt_coverage":180}']];
  assert.deepEqual(computeEvidenceLeakageFindings(clean), []);
  const dirty = [["bad.json", '{"api_key":"x"}']];
  assert.equal(computeEvidenceLeakageFindings(dirty).length, 1);
});
