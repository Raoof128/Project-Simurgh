import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateMockOutput } from "../../../../src/llmShield/gateway/mockGatewayProvider.js";
import { getScenario } from "../../../../src/llmShield/stage3dMockScenarios.js";

describe("mockGatewayProvider", () => {
  test("benign scenario -> text output, no network, no tool", () => {
    const r = generateMockOutput({ scenario: getScenario("benign") });
    assert.equal(r.provider, "mock");
    assert.equal(r.provider_mode, "mock");
    assert.equal(r.provider_called, true);
    assert.equal(r.network_egress_used, false);
    assert.equal(r.provider_response_kind, "text");
    assert.equal(r.tool_request, null);
  });
  test("tool_escalation scenario -> tool_request kind", () => {
    const r = generateMockOutput({ scenario: getScenario("tool_escalation") });
    assert.equal(r.provider_response_kind, "tool_request");
    assert.equal(r.tool_request.tool_class, "shell_command");
  });
  test("policy_leak scenario -> leaky_text kind", () => {
    const r = generateMockOutput({ scenario: getScenario("policy_leak") });
    assert.equal(r.provider_response_kind, "leaky_text");
  });
});
