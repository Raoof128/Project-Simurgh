// SPDX-License-Identifier: AGPL-3.0-or-later
// Maps a provider mode to a provider with a generate() method. Core ships mock and
// recorded_fixture; Stage 3E-live adds anthropic (lazy SDK import lives inside the
// adapter, not here). The live path is still env-gated by liveProviderGuard upstream.
import { generateMockOutput } from "./mockGatewayProvider.js";
import { generateFromFixture } from "./recordedFixtureProvider.js";
import { generateAnthropicOutput } from "./anthropicProviderAdapter.js";

export function getGatewayProvider(providerMode) {
  if (providerMode === "mock") {
    return { name: "mock", generate: (args) => generateMockOutput(args) };
  }
  if (providerMode === "recorded_fixture") {
    return { name: "recorded_fixture", generate: (args) => generateFromFixture(args.fixture) };
  }
  if (providerMode === "live") {
    return { name: "anthropic", generate: (args) => generateAnthropicOutput(args) };
  }
  throw new Error("gateway_provider_mode_invalid");
}
