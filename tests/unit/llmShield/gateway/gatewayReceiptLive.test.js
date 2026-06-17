// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildGatewayReceipt } from "../../../../src/llmShield/gateway/gatewayReceipt.js";
import { GATEWAY_EVENTS } from "../../../../src/llmShield/gateway/gatewayAudit.js";

const base = {
  sessionIdHash: "s",
  runId: "gw_run_001",
  taskType: "qa",
  inputHash: "i",
  normalisedInputHash: "n",
  contextVerdict: "demoted",
  contextHashes: [],
  gatewayVerdict: "accepted",
  providerMode: "live",
  provider: "anthropic",
  providerCalled: true,
  providerResponseKind: "text",
  providerResponseHash: "p",
  toolGateVerdict: "not_requested",
  toolNameHash: null,
  outputFirewallVerdict: "accepted",
  outputHash: "o",
  riskScore: 2,
  riskVerdict: "safe",
  latencyBucket: "250ms-1s",
  inputTokenBucket: "0-1k",
  outputTokenBucket: "0-1k",
  reasonCodes: [],
  auditEntryHash: "a",
  timestamp: "2026-06-18T00:00:00Z",
};

describe("gatewayReceipt live", () => {
  test("no live object -> no live fields, egress false (no drift)", () => {
    const r = buildGatewayReceipt(base);
    assert.equal(r.network_egress_used, false);
    assert.ok(!("live_context_mode" in r));
  });
  test("live object adds metadata-only fields; egress true", () => {
    const r = buildGatewayReceipt({
      ...base,
      networkEgressUsed: true,
      live: {
        provider_model_hash: "m",
        provider_request_shape_hash: "rs",
        provider_response_kind: "text",
        live_context_mode: "minimal_summary",
        live_context_sent: true,
      },
    });
    assert.equal(r.network_egress_used, true);
    assert.equal(r.live_context_mode, "minimal_summary");
    assert.equal(r.provider_model_hash, "m");
    assert.equal(r.provider_side_tools_enabled, false);
    assert.equal(r.sdk_tool_runner_used, false);
    assert.equal(r.raw_provider_transcript_recorded, false);
    assert.equal(r.api_key_recorded, false);
  });
  test("audit exposes live event names", () => {
    assert.equal(
      GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_CALLED,
      "LLM_GATEWAY_LIVE_PROVIDER_CALLED"
    );
    assert.equal(
      GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONFIG_REJECTED,
      "LLM_GATEWAY_LIVE_CONFIG_REJECTED"
    );
  });
});
