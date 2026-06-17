// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GATEWAY_PROVIDERS_LIVE,
  GATEWAY_PROVIDER_MODES,
} from "../../../../src/llmShield/gateway/providerTypes.js";

describe("providerTypes live", () => {
  test("anthropic is the only live provider", () => {
    assert.deepEqual([...GATEWAY_PROVIDERS_LIVE], ["anthropic"]);
  });
  test("live remains a recognised mode", () => {
    assert.ok(GATEWAY_PROVIDER_MODES.includes("live"));
  });
  test("live providers list is frozen", () => {
    assert.ok(Object.isFrozen(GATEWAY_PROVIDERS_LIVE));
  });
});
