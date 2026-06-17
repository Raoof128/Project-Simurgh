import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GATEWAY_PROVIDER_MODES,
  GATEWAY_PROVIDERS_CORE,
  PROVIDER_RESPONSE_KINDS,
} from "../../../../src/llmShield/gateway/providerTypes.js";

describe("providerTypes", () => {
  test("provider modes include the three contract modes and are frozen", () => {
    assert.deepEqual([...GATEWAY_PROVIDER_MODES], ["mock", "recorded_fixture", "live"]);
    assert.ok(Object.isFrozen(GATEWAY_PROVIDER_MODES));
  });
  test("core providers exclude live (no adapter in core)", () => {
    assert.deepEqual([...GATEWAY_PROVIDERS_CORE], ["mock", "recorded_fixture"]);
    assert.ok(!GATEWAY_PROVIDERS_CORE.includes("live"));
    assert.ok(Object.isFrozen(GATEWAY_PROVIDERS_CORE));
  });
  test("response kinds cover text/tool/refusal/error/leaky and are frozen", () => {
    assert.deepEqual([...PROVIDER_RESPONSE_KINDS].sort(), [
      "error",
      "leaky_text",
      "refusal",
      "text",
      "tool_request",
    ]);
    assert.ok(Object.isFrozen(PROVIDER_RESPONSE_KINDS));
  });
});
