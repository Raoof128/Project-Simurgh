import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  EXPECTED_STAGE3G_TRACK_COUNTS,
  STAGE3G_MODES,
  buildStage3gManifest,
  computeProviderOutputHashes,
  computeStage3gMetrics,
  enforceStage3gHardGates,
  selectStage3gCases,
} from "../../../tests/e2e/llm_shield_stage3g_live_shadow_lib.mjs";

const fixture = (track, n, overrides = {}) => ({
  case_id: `stage3f-${track}-${String(n).padStart(3, "0")}`,
  track,
  attack_style: `${track}_style`,
  ground_truth: track === "benign" || track === "hard_negative" ? "benign" : "malicious",
  expected_boundary: track === "benign" || track === "hard_negative" ? "allowed" : "tool_gate",
  expected_result: track === "benign" || track === "hard_negative" ? "allowed" : "contained",
  input: `fixture input ${track} ${n}`,
  contexts: [],
  provider_case_id: `synthetic-${track}-${n}`,
  observed: {
    unsafe_tool_executed: false,
    unsafe_output_exported: false,
    context_authority_escalated: false,
    receipt_exported: true,
    audit_verified: true,
    provider_response_hash: `sha256:${track}${n}`,
  },
  ...overrides,
});

describe("stage3g live shadow lib", () => {
  test("selectStage3gCases chooses the fixed 60-case split", () => {
    const corpus = [];
    for (const [track, count] of Object.entries(EXPECTED_STAGE3G_TRACK_COUNTS)) {
      for (let i = 1; i <= count + 2; i++) corpus.push(fixture(track, i));
    }
    const selected = selectStage3gCases(corpus);
    assert.equal(selected.length, 60);
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(EXPECTED_STAGE3G_TRACK_COUNTS).map((track) => [
          track,
          selected.filter((fx) => fx.track === track).length,
        ])
      ),
      EXPECTED_STAGE3G_TRACK_COUNTS
    );
  });

  test("buildStage3gManifest expands each case across mock, recorded, and live shadow modes", () => {
    const manifest = buildStage3gManifest([fixture("tool_injection", 1)]);
    assert.deepEqual(
      manifest.cases.map((entry) => entry.mode),
      STAGE3G_MODES
    );
    assert.equal(manifest.cases[0].input, undefined);
    assert.equal(manifest.cases[0].input_hash.startsWith("sha256:"), true);
  });

  test("computeProviderOutputHashes covers every selected case without raw output", () => {
    const hashes = computeProviderOutputHashes([fixture("output_leakage", 1)]);
    assert.equal(hashes.outputs.length, 3);
    assert.ok(hashes.outputs.every((entry) => entry.provider_output_hash.startsWith("sha256:")));
    assert.equal(JSON.stringify(hashes).includes("fixture input"), false);
  });

  test("computeStage3gMetrics reports containment hard gates and measured live signals", () => {
    const metrics = computeStage3gMetrics([fixture("tool_injection", 1), fixture("benign", 1)]);
    assert.equal(metrics.shadow_case_count, 2);
    assert.equal(metrics.shadow_observation_count, 6);
    assert.equal(metrics.unsafe_tool_execution_rate, 0);
    assert.equal(metrics.unsafe_output_export_rate, 0);
    assert.equal(metrics.context_authority_escalation_rate, 0);
    assert.equal(metrics.receipt_coverage_rate, 1);
    assert.equal(metrics.audit_verification_rate, 1);
    assert.equal(metrics.provider_output_hash_coverage_rate, 1);
    assert.equal(metrics.live_model_refusal_rate, "measured_optional_live_only");
  });

  test("enforceStage3gHardGates fails closed on any unsafe consequence", () => {
    const result = enforceStage3gHardGates({
      unsafe_tool_execution_rate: 0,
      unsafe_output_export_rate: 0.1,
      context_authority_escalation_rate: 0,
      receipt_coverage_rate: 1,
      audit_verification_rate: 1,
      raw_transcript_stored_count: 0,
      provider_output_hash_coverage_rate: 1,
      generated_evidence_leakage_count: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes("unsafe_output_export_rate")));
  });
});
