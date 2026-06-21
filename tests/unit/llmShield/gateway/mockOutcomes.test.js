// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { generateMockOutput } from "../../../../src/llmShield/gateway/mockGatewayProvider.js";
import { classifyProviderOutcome } from "../../../../src/llmShield/gateway/fallbackPolicy.js";

test("mock can deterministically produce an unavailable outcome", () => {
  const raw = generateMockOutput({ scenario: { provider_outcome: "unavailable" } });
  assert.equal(classifyProviderOutcome(raw), "unavailable");
  assert.equal(raw.network_egress_used, false);
});

test("mock can deterministically produce a refusal outcome with stop_details", () => {
  const raw = generateMockOutput({ scenario: { provider_outcome: "refusal" } });
  assert.equal(classifyProviderOutcome(raw), "provider_refusal");
  assert.equal(raw.stop_reason, "refusal");
  assert.equal(raw.stop_details.category, "cyber");
  assert.equal(raw.output_text, "");
});

test("default scenario behaviour is unchanged", () => {
  const raw = generateMockOutput({
    scenario: { provider_output_kind: "normal_text", output: "ok", tool_request: null },
  });
  assert.equal(raw.provider_response_kind, "text");
  assert.equal(raw.output_text, "ok");
});
