import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getGatewayProvider } from "../../../../src/llmShield/gateway/providerRegistry.js";

describe("providerRegistry", () => {
  test("mock mode returns the mock provider", () => {
    assert.equal(getGatewayProvider("mock").name, "mock");
  });
  test("recorded_fixture mode returns the recorded provider", () => {
    assert.equal(getGatewayProvider("recorded_fixture").name, "recorded_fixture");
  });
  test("live mode throws (no adapter in core)", () => {
    assert.throws(() => getGatewayProvider("live"), /gateway_live_provider_not_implemented/);
  });
  test("unknown mode throws", () => {
    assert.throws(() => getGatewayProvider("nope"), /gateway_provider_mode_invalid/);
  });
});
