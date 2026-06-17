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
  test("live mode returns the anthropic adapter (Stage 3E-live)", () => {
    // Stage 3E-live: live is no longer a throw at the registry. The live path is
    // env-gated upstream by liveProviderGuard; the registry only maps the mode.
    const p = getGatewayProvider("live");
    assert.equal(p.name, "anthropic");
    assert.equal(typeof p.generate, "function");
  });
  test("unknown mode throws", () => {
    assert.throws(() => getGatewayProvider("nope"), /gateway_provider_mode_invalid/);
  });
});
