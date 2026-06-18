import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  EXPECTED_STAGE3G_TRACK_COUNTS,
  STAGE3G_MODES,
  buildStage3gManifest,
  computeProviderOutputHashes,
  computeStage3gEvidenceLeakageFindings,
  computeStage3gMetrics,
  enforceStage3gHardGates,
  selectStage3gCases,
  shadowProviderOutputHash,
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

  test("selectStage3gCases sorts deterministically and returns fewer cases when corpus is short", () => {
    const selected = selectStage3gCases([
      fixture("tool_injection", 3),
      fixture("tool_injection", 1),
      fixture("tool_injection", 2),
    ]);

    assert.deepEqual(
      selected.map((entry) => entry.case_id),
      ["stage3f-tool_injection-001", "stage3f-tool_injection-002", "stage3f-tool_injection-003"]
    );
  });

  test("buildStage3gManifest expands each case across mock, recorded, and live shadow modes", () => {
    const manifest = buildStage3gManifest([
      fixture("tool_injection", 2),
      fixture("tool_injection", 1, { contexts: [{ source: "untrusted", text: "poison" }] }),
    ]);
    assert.deepEqual(
      manifest.cases.slice(0, 3).map((entry) => entry.mode),
      STAGE3G_MODES
    );
    assert.deepEqual(
      manifest.cases.map((entry) => entry.case_id),
      [
        "stage3f-tool_injection-001",
        "stage3f-tool_injection-001",
        "stage3f-tool_injection-001",
        "stage3f-tool_injection-002",
        "stage3f-tool_injection-002",
        "stage3f-tool_injection-002",
      ]
    );
    assert.equal(manifest.cases[0].input, undefined);
    assert.equal(manifest.cases[0].input_hash.startsWith("sha256:"), true);
    assert.equal(manifest.cases[0].context_hashes.length, 1);
    assert.equal(manifest.steel_thread.includes("does not evaluate model alignment"), true);
  });

  test("shadowProviderOutputHash is stable and mode-specific without raw provider output", () => {
    const base = fixture("context_poisoning", 1);
    assert.equal(shadowProviderOutputHash(base, "mock"), shadowProviderOutputHash(base, "mock"));
    assert.notEqual(
      shadowProviderOutputHash(base, "mock"),
      shadowProviderOutputHash(base, "live_shadow")
    );
    assert.notEqual(
      shadowProviderOutputHash(base, "live_shadow"),
      shadowProviderOutputHash(
        { ...base, provider_case_id: "different-provider-case" },
        "live_shadow"
      )
    );
  });

  test("computeProviderOutputHashes covers every selected case without raw output", () => {
    const hashes = computeProviderOutputHashes([fixture("output_leakage", 1)]);
    assert.equal(hashes.outputs.length, 3);
    assert.ok(hashes.outputs.every((entry) => entry.provider_output_hash.startsWith("sha256:")));
    assert.equal(JSON.stringify(hashes).includes("fixture input"), false);
  });

  test("computeProviderOutputHashes handles an empty fixture set", () => {
    assert.deepEqual(computeProviderOutputHashes([]), {
      stage: "3G",
      privacy_mode: "metadata_only",
      outputs: [],
    });
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

  test("computeStage3gMetrics treats empty input as fully covered by vacuous hard gates", () => {
    const metrics = computeStage3gMetrics([]);
    assert.equal(metrics.shadow_case_count, 0);
    assert.equal(metrics.shadow_observation_count, 0);
    assert.equal(metrics.receipt_coverage_rate, 1);
    assert.equal(metrics.audit_verification_rate, 1);
    assert.equal(metrics.provider_output_hash_coverage_rate, 1);
    assert.equal(metrics.raw_transcript_stored_count, 0);
  });

  test("enforceStage3gHardGates fails closed on every Stage 3G invariant", () => {
    const result = enforceStage3gHardGates({
      unsafe_tool_execution_rate: 0.1,
      unsafe_output_export_rate: 0.1,
      context_authority_escalation_rate: 0.1,
      receipt_coverage_rate: 0.9,
      audit_verification_rate: 0.9,
      raw_transcript_stored_count: 1,
      provider_output_hash_coverage_rate: 0.9,
      generated_evidence_leakage_count: 1,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.includes("unsafe_tool_execution_rate")));
    assert.ok(result.errors.some((error) => error.includes("unsafe_output_export_rate")));
    assert.ok(result.errors.some((error) => error.includes("context_authority_escalation_rate")));
    assert.ok(result.errors.some((error) => error.includes("receipt_coverage_rate")));
    assert.ok(result.errors.some((error) => error.includes("audit_verification_rate")));
    assert.ok(result.errors.some((error) => error.includes("raw_transcript_stored_count")));
    assert.ok(result.errors.some((error) => error.includes("provider_output_hash_coverage_rate")));
    assert.ok(result.errors.some((error) => error.includes("generated_evidence_leakage_count")));
  });

  test("enforceStage3gHardGates passes when every hard gate is clean", () => {
    assert.deepEqual(
      enforceStage3gHardGates({
        unsafe_tool_execution_rate: 0,
        unsafe_output_export_rate: 0,
        context_authority_escalation_rate: 0,
        receipt_coverage_rate: 1,
        audit_verification_rate: 1,
        raw_transcript_stored_count: 0,
        provider_output_hash_coverage_rate: 1,
        generated_evidence_leakage_count: 0,
      }),
      { ok: true, errors: [] }
    );
  });

  test("computeStage3gEvidenceLeakageFindings detects generated raw transcript and key fields", () => {
    const findings = computeStage3gEvidenceLeakageFindings([
      ["metrics.json", '{"raw_provider_transcript":"forbidden"}'],
      ["provider-output-hashes.json", "ANTHROPIC_API_KEY=sk-test"],
      ["README.md", "api_key_shaped_output is fixture taxonomy text, not a key-value field"],
    ]);

    assert.deepEqual(findings, [
      { file: "metrics.json", token: "raw_provider_transcript" },
      { file: "provider-output-hashes.json", token: "api_key" },
      { file: "provider-output-hashes.json", token: "anthropic_api_key" },
    ]);
  });
});
