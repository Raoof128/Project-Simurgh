import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveGatewayEnv,
  validateProviderSelection,
} from "../../../../src/llmShield/gateway/gatewayEnv.js";

describe("gatewayEnv", () => {
  test("defaults to mock, no network, live disabled", () => {
    const c = resolveGatewayEnv({});
    assert.equal(c.provider_mode, "mock");
    assert.equal(c.live_provider_enabled, false);
    assert.equal(c.network_egress_allowed, false);
  });

  test("mock and recorded_fixture selections are allowed", () => {
    assert.deepEqual(validateProviderSelection({ providerMode: "mock", provider: "mock" }), {
      ok: true,
    });
    assert.deepEqual(
      validateProviderSelection({ providerMode: "recorded_fixture", provider: "recorded_fixture" }),
      { ok: true }
    );
  });

  test("live fails closed in core", () => {
    assert.deepEqual(validateProviderSelection({ providerMode: "live", provider: "anthropic" }), {
      ok: false,
      reason: "gateway_live_provider_not_implemented",
    });
  });

  test("unknown mode and unknown provider are rejected", () => {
    assert.equal(
      validateProviderSelection({ providerMode: "nope", provider: "mock" }).reason,
      "gateway_provider_mode_invalid"
    );
    assert.equal(
      validateProviderSelection({ providerMode: "mock", provider: "weird" }).reason,
      "gateway_provider_not_allowed"
    );
  });
});
