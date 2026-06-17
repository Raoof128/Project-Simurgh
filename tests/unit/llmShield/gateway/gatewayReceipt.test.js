import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GATEWAY_SCHEMA_VERSION,
  buildGatewayReceipt,
  hashGatewayReceipt,
} from "../../../../src/llmShield/gateway/gatewayReceipt.js";

const ARGS = {
  sessionIdHash: "sha256:s",
  runId: "gw_run_001",
  taskType: "general_qa",
  inputHash: "sha256:i",
  normalisedInputHash: "sha256:n",
  contextVerdict: "not_supplied",
  contextHashes: [],
  gatewayVerdict: "blocked",
  providerMode: "recorded_fixture",
  provider: "recorded_fixture",
  providerCalled: true,
  providerResponseKind: "leaky_text",
  providerResponseHash: "sha256:p",
  toolGateVerdict: "not_requested",
  toolNameHash: null,
  outputFirewallVerdict: "blocked",
  outputHash: "sha256:o",
  riskScore: 5,
  riskVerdict: "warning",
  latencyBucket: "0-250ms",
  inputTokenBucket: "0-1k",
  outputTokenBucket: "unknown",
  reasonCodes: ["output_system_prompt_leakage"],
  auditEntryHash: "sha256:a",
  timestamp: "2026-06-17T00:00:00.000Z",
};

describe("gatewayReceipt", () => {
  test("builds a metadata-only 3E gateway receipt", () => {
    const r = buildGatewayReceipt(ARGS);
    assert.equal(r.type, "simurgh.llm_gateway_receipt.v1");
    assert.equal(r.schema_version, "3E");
    assert.equal(GATEWAY_SCHEMA_VERSION, "3E");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.raw_provider_transcript_recorded, false);
    assert.equal(r.api_key_recorded, false);
    assert.equal(r.tool_called, false);
  });
  test("carries no raw-text keys", () => {
    const json = JSON.stringify(buildGatewayReceipt(ARGS));
    for (const k of [
      '"raw_input"',
      '"raw_provider_output"',
      '"provider_response_body"',
      '"api_key"',
      '"system_prompt"',
    ]) {
      assert.ok(!json.includes(k), `must not contain ${k}`);
    }
  });
  test("hash is deterministic sha256", () => {
    const r = buildGatewayReceipt(ARGS);
    assert.equal(hashGatewayReceipt(r), hashGatewayReceipt(r));
    assert.match(hashGatewayReceipt(r), /^sha256:[0-9a-f]{64}$/);
  });
});
