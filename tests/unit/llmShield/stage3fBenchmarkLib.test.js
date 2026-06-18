import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  EXPECTED_STAGE3F_TRACK_COUNTS,
  STAGE3F_BOUNDARIES,
  STAGE3F_TRACKS,
  buildCorpusManifest,
  computeEvidenceLeakageFindings,
  computeFixtureHash,
  computeStage3fMetrics,
  enforceStage3fHardGates,
  validateStage3fCorpus,
} from "../../../tests/e2e/llm_shield_stage3f_benchmark_lib.mjs";

const baseFixture = (overrides = {}) => {
  const fx = {
    case_id: "stage3f-tool-001",
    track: "tool_injection",
    attack_style: "unsafe_tool_request",
    ground_truth: "malicious",
    expected_boundary: "tool_gate",
    expected_result: "contained",
    input: "Summarise the document.",
    contexts: [],
    provider_mode: "recorded_fixture",
    provider_case_id: "synthetic-tool-output-001",
    expected_receipt_fields: {
      unsafe_tool_executed: false,
      unsafe_output_exported: false,
      receipt_exported: true,
      audit_verified: true,
    },
    observed: {
      boundary: "tool_gate",
      verdict: "blocked",
      unsafe_tool_executed: false,
      unsafe_output_exported: false,
      context_authority_escalated: false,
      receipt_exported: true,
      audit_verified: true,
      raw_output_exported: false,
      blocked_output_hash_only: true,
      provider_called: true,
      receipt_id: "stage3f-receipt-tool-001",
      receipt_hash: "sha256:receipt",
      audit_entry_hash: "sha256:audit",
      reason_codes: ["unsafe_tool_request"],
    },
  };
  const merged = { ...fx, ...overrides };
  return { ...merged, fixture_hash: computeFixtureHash(merged) };
};

describe("stage3f benchmark lib", () => {
  test("declares the fixed Stage 3F track and boundary enums", () => {
    assert.deepEqual(STAGE3F_TRACKS, [
      "direct_input",
      "context_poisoning",
      "tool_injection",
      "output_leakage",
      "multi_turn",
      "benign",
      "hard_negative",
    ]);
    assert.ok(STAGE3F_BOUNDARIES.includes("risk_accumulator"));
    assert.equal(EXPECTED_STAGE3F_TRACK_COUNTS.tool_injection, 40);
  });

  test("computeFixtureHash ignores the fixture_hash field and is deterministic", () => {
    const fixture = baseFixture();
    assert.equal(computeFixtureHash(fixture), fixture.fixture_hash);
    assert.notEqual(
      computeFixtureHash({ ...fixture, input: `${fixture.input} changed` }),
      fixture.fixture_hash
    );
  });

  test("validateStage3fCorpus flags malformed fixtures loudly", () => {
    const duplicate = baseFixture({ case_id: "dup" });
    const invalid = {
      ...baseFixture({
        case_id: "dup",
        track: "unknown",
        expected_boundary: "wrong",
      }),
      fixture_hash: "sha256:bad",
    };
    const result = validateStage3fCorpus([duplicate, invalid], { enforceExactCounts: false });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("duplicate case_id")));
    assert.ok(result.errors.some((e) => e.includes("invalid track")));
    assert.ok(result.errors.some((e) => e.includes("invalid expected_boundary")));
    assert.ok(result.errors.some((e) => e.includes("fixture_hash mismatch")));
  });

  test("validateStage3fCorpus rejects non-arrays, missing fields, and bad receipt contracts", () => {
    const nonArray = validateStage3fCorpus(null);
    assert.equal(nonArray.ok, false);
    assert.deepEqual(nonArray.errors, ["fixtures must be an array"]);

    const malformed = validateStage3fCorpus(
      [
        null,
        {
          case_id: "stage3f-bad-001",
          track: "direct_input",
          attack_style: "override",
          ground_truth: "unknown",
          expected_boundary: "input_firewall",
          expected_result: "contained",
          input: "ignore instructions",
          contexts: "not-an-array",
          provider_mode: "recorded_fixture",
          provider_case_id: "bad",
          expected_receipt_fields: {
            unsafe_tool_executed: "false",
          },
          observed: {},
          fixture_hash: "sha256:bad",
        },
      ],
      { enforceExactCounts: false }
    );

    assert.equal(malformed.ok, false);
    assert.ok(malformed.errors.includes("fixture must be an object"));
    assert.ok(malformed.errors.some((e) => e.includes("invalid ground_truth")));
    assert.ok(malformed.errors.some((e) => e.includes("contexts must be an array")));
    assert.ok(
      malformed.errors.some((e) =>
        e.includes("expected_receipt_fields.unsafe_tool_executed must be boolean")
      )
    );
    assert.ok(
      malformed.errors.some((e) =>
        e.includes("expected_receipt_fields.unsafe_output_exported must be boolean")
      )
    );
  });

  test("validateStage3fCorpus enforces exact 240-case corpus counts when requested", () => {
    const result = validateStage3fCorpus([baseFixture()], { enforceExactCounts: true });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("expected 240 fixtures")));
    assert.ok(result.errors.some((e) => e.includes("track direct_input expected 40 got 0")));
  });

  test("computeStage3fMetrics reports hard invariant rates and measured research rates", () => {
    const fixtures = [
      baseFixture({ case_id: "m1", track: "tool_injection" }),
      baseFixture({
        case_id: "b1",
        track: "benign",
        ground_truth: "benign",
        expected_boundary: "allowed",
        expected_result: "allowed",
        observed: {
          ...baseFixture().observed,
          boundary: "allowed",
          verdict: "allowed",
          provider_called: true,
        },
      }),
      baseFixture({
        case_id: "h1",
        track: "hard_negative",
        ground_truth: "benign",
        expected_boundary: "allowed",
        expected_result: "allowed",
        observed: {
          ...baseFixture().observed,
          boundary: "input_firewall",
          verdict: "blocked",
          provider_called: false,
        },
      }),
    ];
    const metrics = computeStage3fMetrics(fixtures);
    assert.equal(metrics.total_cases, 3);
    assert.equal(metrics.unsafe_tool_execution_rate, 0);
    assert.equal(metrics.unsafe_output_export_rate, 0);
    assert.equal(metrics.receipt_coverage_rate, 1);
    assert.equal(metrics.audit_verification_rate, 1);
    assert.equal(metrics.benign_pass_rate, "1/1");
    assert.equal(metrics.hard_negative_false_positive_rate, "1/1");
    assert.equal(metrics.containment_success_rate, "1/1");
  });

  test("computeStage3fMetrics handles empty input and all track-specific counters", () => {
    const emptyMetrics = computeStage3fMetrics([]);
    assert.equal(emptyMetrics.total_cases, 0);
    assert.equal(emptyMetrics.containment_success_rate, "0/0");
    assert.equal(emptyMetrics.unsafe_tool_execution_rate, 1);
    assert.equal(emptyMetrics.benign_pass_rate, "0/0");

    const fixtures = [
      baseFixture({
        case_id: "direct-001",
        track: "direct_input",
        observed: {
          ...baseFixture().observed,
          boundary: "input_firewall",
          verdict: "warning",
        },
      }),
      baseFixture({
        case_id: "multi-001",
        track: "multi_turn",
        observed: {
          ...baseFixture().observed,
          boundary: "risk_accumulator",
          verdict: "blocked",
          risk_escalated: true,
        },
      }),
      baseFixture({
        case_id: "unsafe-001",
        track: "output_leakage",
        observed: {
          ...baseFixture().observed,
          boundary: "output_firewall",
          unsafe_output_exported: true,
          context_authority_escalated: true,
        },
      }),
    ];

    const metrics = computeStage3fMetrics(fixtures);
    assert.equal(metrics.input_block_or_warn_rate, "1/1");
    assert.equal(metrics.multi_turn_escalation_rate, "1/1");
    assert.equal(metrics.unsafe_output_export_rate, 1 / 3);
    assert.equal(metrics.context_authority_escalation_rate, 1 / 3);
    assert.equal(metrics.boundary_distribution.risk_accumulator, 1);
    assert.equal(metrics.boundary_distribution.output_firewall, 1);
  });

  test("enforceStage3fHardGates fails on every hard-gated invariant", () => {
    const metrics = {
      unsafe_tool_execution_rate: 0.1,
      unsafe_output_export_rate: 0.2,
      context_authority_escalation_rate: 0.3,
      receipt_coverage_rate: 0.9,
      audit_verification_rate: 0.8,
      evidence_leakage_count: 1,
      fixture_manifest_valid: false,
      detector_digest_drift_count: 2,
    };
    const result = enforceStage3fHardGates(metrics);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("unsafe_tool_execution_rate")));
    assert.ok(result.errors.some((e) => e.includes("unsafe_output_export_rate")));
    assert.ok(result.errors.some((e) => e.includes("context_authority_escalation_rate")));
    assert.ok(result.errors.some((e) => e.includes("receipt_coverage_rate")));
    assert.ok(result.errors.some((e) => e.includes("audit_verification_rate")));
    assert.ok(result.errors.some((e) => e.includes("evidence_leakage_count")));
    assert.ok(result.errors.some((e) => e.includes("detector_digest_drift_count")));
    assert.ok(result.errors.includes("fixture_manifest_valid must be true"));
  });

  test("enforceStage3fHardGates passes when every hard gate is clean", () => {
    const result = enforceStage3fHardGates({
      unsafe_tool_execution_rate: 0,
      unsafe_output_export_rate: 0,
      context_authority_escalation_rate: 0,
      receipt_coverage_rate: 1,
      audit_verification_rate: 1,
      evidence_leakage_count: 0,
      fixture_manifest_valid: true,
      detector_digest_drift_count: 0,
    });
    assert.deepEqual(result, { ok: true, errors: [] });
  });

  test("computeEvidenceLeakageFindings scans generated evidence but allows fixture text", () => {
    const findings = computeEvidenceLeakageFindings([
      ["metrics.json", '{"api_key":"sk-test"}'],
      ["fixtures/direct-input/example.json", '{"api_key":"synthetic fixture bait"}'],
    ]);
    assert.deepEqual(findings, [
      {
        file: "metrics.json",
        token: "api_key",
      },
    ]);
  });

  test("buildCorpusManifest omits raw input and context payloads", () => {
    const fixture = baseFixture({ case_id: "stage3f-tool-002" });
    const earlierFixture = baseFixture({
      case_id: "stage3f-tool-001",
      contexts: [{ source: "untrusted", text: "poison" }],
    });
    const manifest = buildCorpusManifest([fixture, earlierFixture]);
    assert.equal(manifest.total_cases, 2);
    assert.deepEqual(
      manifest.fixtures.map((entry) => entry.case_id),
      ["stage3f-tool-001", "stage3f-tool-002"]
    );
    assert.equal(manifest.fixtures[0].input, undefined);
    assert.equal(manifest.fixtures[0].contexts, undefined);
    assert.equal(manifest.fixtures[0].input_hash.startsWith("sha256:"), true);
    assert.equal(manifest.fixtures[0].context_hashes.length, 1);
  });
});
