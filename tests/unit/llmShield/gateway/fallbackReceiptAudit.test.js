// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildGatewayReceipt } from "../../../../src/llmShield/gateway/gatewayReceipt.js";
import { createChain, verifyChain } from "../../../../src/audit/hmacChain.js";
import {
  recordGatewayFallbackSwap,
  GATEWAY_EVENTS,
} from "../../../../src/llmShield/gateway/gatewayAudit.js";

test("receipt carries fallback fields", () => {
  const r = buildGatewayReceipt({
    sessionIdHash: "sha256:s",
    runId: "gw_run_001",
    taskType: "t",
    inputHash: "sha256:i",
    normalisedInputHash: "sha256:n",
    contextVerdict: "accepted",
    gatewayVerdict: "warning",
    providerMode: "mock",
    provider: "mock",
    providerCalled: true,
    providerResponseKind: "text",
    providerResponseHash: "sha256:p",
    toolGateVerdict: "not_requested",
    outputFirewallVerdict: "allowed",
    outputHash: "sha256:o",
    riskScore: 3,
    riskVerdict: "warning",
    reasonCodes: [],
    auditEntryHash: "sha256:a",
    timestamp: "2026-06-21T00:00:00.000Z",
    fallbackChain: [
      { from: "claude-fable-5", to: "claude-opus-4-8", trigger: "availability", risk_delta: 2 },
    ],
    fallbackUsed: true,
    fallbackOnRefusalEnabled: false,
    fallbackBudget: { max_hops: 1, timeout_ms: 30000, max_additional_provider_calls: 1 },
    fallbackTerminalReason: null,
  });
  assert.equal(r.fallback_used, true);
  assert.equal(r.fallback_on_refusal_enabled, false);
  assert.equal(r.fallback_chain[0].to, "claude-opus-4-8");
  assert.equal(r.fallback_budget.max_hops, 1);
  assert.equal(r.fallback_terminal_reason, null);
});

test("recordGatewayFallbackSwap appends a verifiable chain entry", () => {
  const chain = createChain();
  const h = recordGatewayFallbackSwap(chain, "k", {
    from: "claude-fable-5",
    to: "claude-opus-4-8",
    trigger: "provider_refusal",
    refusalCategory: "cyber",
    riskDelta: 3,
  });
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(verifyChain(chain, "k").valid, true);
  assert.equal(chain.entries.at(-1).type, GATEWAY_EVENTS.LLM_GATEWAY_FALLBACK_SWAP);
});
