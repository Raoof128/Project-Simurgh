// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  readPath,
  METRIC_CONTRACT,
  evaluatePooling,
  normaliseSources,
  buildPerFamilyPanels,
  computeLedgerHashBinding,
  STAGE3M_ATTESTATION_FILES,
  compileClaims,
  STAGE3N_FORBIDDEN_TOKENS,
  computeEvidenceLeakageFindings,
  enforceStage3nHardGates,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

const CLEAN_GATES = {
  source_index_valid: true,
  metric_contract_schema_valid: true,
  normalised_metrics_schema_valid: true,
  all_ledger_rows_hash_to_committed_evidence: true,
  prose_only_metric_claims_excluded: true,
  claim_evidence_map_complete: true,
  claim_consistency_report_generated: true,
  unresolved_numeric_claim_conflicts: 0,
  cross_family_pooling_performed: 0,
  mismatched_denominator_pooling_refusal_test_passed: true,
  pooled_asr_reported: false,
  per_family_panels_present: true,
  frontier_status: "not_applicable_degenerate",
  frontier_reason_recorded: true,
  stage3m_attestation_validation_present: true,
  source_evidence_hashes_match: true,
  generated_evidence_leakage: 0,
  src_llmShield_policy_drift: 0,
  overclaim_wording_detected: 0,
};

const VERIFIED_CLAIM = {
  claim_id: "3n.claim.stage3l_targeted_asr",
  source_file: "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  source_field: "malicious_targeted_asr",
  expected: 0,
  denominator_field: "malicious_total",
  expected_denominator: 150,
  status: "verified",
};
const EXCLUDED_CLAIM = {
  claim_id: "3n.claim.stage3h_l2_historical_overdefence",
  source_type: "prose_history",
  frozen_metric_artifact_present: false,
  status: "excluded_from_ledger",
  reason: "No committed metrics artifact proves this row.",
};

const SAMPLE_SOURCES = {
  agentdojo_layer2: {
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 10 } },
    utility_preserved_rate: { numerator: 10, denominator: 10 },
  },
  agentdojo_full: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 949 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  adaptive_readiness: {
    agentdojo_native_metrics: { defended: { targeted_asr: { numerator: 0, denominator: 385 } } },
    simurgh_containment_metrics: { over_defence_rate: { numerator: 0, denominator: 97 } },
  },
  fable5_reference_containment: {
    malicious_targeted_asr: 0,
    malicious_total: 150,
    benign_hard_negative_passed: 30,
    benign_total: 30,
  },
  attestation_validity: { verifier_pass: true },
};

test("STAGE3N_FAMILIES is the five frozen families", () => {
  assert.deepEqual(STAGE3N_FAMILIES, [
    "agentdojo_layer2",
    "agentdojo_full",
    "adaptive_readiness",
    "fable5_reference_containment",
    "attestation_validity",
  ]);
  assert.throws(() => STAGE3N_FAMILIES.push("x"));
});

test("STAGE3N_SOURCE_FILES maps every family to a path", () => {
  for (const f of STAGE3N_FAMILIES) {
    assert.equal(typeof STAGE3N_SOURCE_FILES[f], "string");
  }
});

test("readPath reads nested dotted paths and returns undefined on miss", () => {
  const obj = { a: { b: { c: 7 } } };
  assert.equal(readPath(obj, "a.b.c"), 7);
  assert.equal(readPath(obj, "a.b.x"), undefined);
  assert.equal(readPath(obj, "a.z.c"), undefined);
});

test("METRIC_CONTRACT has one entry per family with required keys", () => {
  assert.equal(METRIC_CONTRACT.length, 5);
  for (const e of METRIC_CONTRACT) {
    for (const k of [
      "source_stage",
      "metric_family",
      "denominator_basis",
      "security_denominator",
      "utility_denominator",
      "pooling_group",
      "pooling_allowed_with",
    ]) {
      assert.ok(k in e, `missing ${k}`);
    }
  }
});

test("evaluatePooling refuses all mismatched denominators and pools none", () => {
  const r = evaluatePooling(METRIC_CONTRACT);
  assert.equal(r.cross_family_pooling_performed, 0);
  assert.equal(r.mismatched_denominator_pooling_refusal_test_passed, true);
  assert.ok(r.refusals.length >= 1);
});

test("normaliseSources produces one row per family with correct roles", () => {
  const rows = normaliseSources(SAMPLE_SOURCES);
  assert.equal(rows.length, 5);
  const att = rows.find((r) => r.family === "attestation_validity");
  assert.equal(att.role, "attestation");
  assert.equal(att.attestation_valid, true);
  assert.deepEqual(att.source_files, STAGE3M_ATTESTATION_FILES);
  const full = rows.find((r) => r.family === "agentdojo_full");
  assert.equal(full.role, "held_line");
  assert.equal(full.security.targeted_asr_denominator, 949);
  assert.equal(full.utility.over_defence_numerator, 0);
  assert.equal(full.source_files.length, 1);
});

test("buildPerFamilyPanels yields one panel per family and no pooled total", () => {
  const panels = buildPerFamilyPanels(normaliseSources(SAMPLE_SOURCES));
  assert.equal(panels.length, 5);
  assert.ok(!panels.some((p) => p.family === "pooled" || p.family === "total"));
});

test("computeLedgerHashBinding is true only when every row file has a hash", () => {
  const rows = normaliseSources(SAMPLE_SOURCES);
  const allFiles = {};
  for (const row of rows) for (const f of row.source_files) allFiles[f] = "sha256:abc";
  assert.equal(computeLedgerHashBinding(rows, allFiles), true);
  delete allFiles[STAGE3M_ATTESTATION_FILES[0]];
  assert.equal(computeLedgerHashBinding(rows, allFiles), false);
});

test("compileClaims passes a clean closed world", () => {
  const out = compileClaims([VERIFIED_CLAIM, EXCLUDED_CLAIM], () => ({
    actual: 0,
    actualDenominator: 150,
  }));
  assert.equal(out.unresolved_numeric_claim_conflicts, 0);
  assert.equal(out.claim_evidence_map_complete, true);
  assert.equal(out.prose_only_metric_claims_excluded, true);
});

test("compileClaims flags a drifted verified number", () => {
  const out = compileClaims([VERIFIED_CLAIM], () => ({ actual: 1, actualDenominator: 150 }));
  assert.equal(out.unresolved_numeric_claim_conflicts, 1);
});

test("compileClaims flags an unrecognised status (open-world leak)", () => {
  const bad = { claim_id: "x", status: "assumed" };
  const out = compileClaims([bad], () => ({ actual: 0, actualDenominator: 0 }));
  assert.equal(out.claim_evidence_map_complete, false);
});

test("compileClaims flags a prose_history claim not excluded", () => {
  const leaky = { claim_id: "y", source_type: "prose_history", status: "verified" };
  const out = compileClaims([leaky], () => ({ actual: 0, actualDenominator: 0 }));
  assert.equal(out.prose_only_metric_claims_excluded, false);
});

test("leakage scanner finds forbidden tokens", () => {
  assert.ok(STAGE3N_FORBIDDEN_TOKENS.length > 0);
  const findings = computeEvidenceLeakageFindings([
    ["a.json", "clean"],
    ["b.json", "Pliny here"],
  ]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, "b.json");
});

test("enforceStage3nHardGates passes a clean gate set", () => {
  assert.equal(enforceStage3nHardGates(CLEAN_GATES).ok, true);
});

test("enforceStage3nHardGates fails on a claim conflict", () => {
  const r = enforceStage3nHardGates({ ...CLEAN_GATES, unresolved_numeric_claim_conflicts: 1 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("unresolved_numeric_claim_conflicts")));
});

test("enforceStage3nHardGates fails on an invalid frontier_status", () => {
  const r = enforceStage3nHardGates({ ...CLEAN_GATES, frontier_status: "computed_fake" });
  assert.equal(r.ok, false);
});
