// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getGatewayProvider } from "../../../../src/llmShield/gateway/providerRegistry.js";

describe("providerRegistry live", () => {
  test("live returns the anthropic provider with a generate fn", () => {
    const p = getGatewayProvider("live");
    assert.equal(p.name, "anthropic");
    assert.equal(typeof p.generate, "function");
  });
  test("mock and recorded_fixture unchanged", () => {
    assert.equal(getGatewayProvider("mock").name, "mock");
    assert.equal(getGatewayProvider("recorded_fixture").name, "recorded_fixture");
  });
});
