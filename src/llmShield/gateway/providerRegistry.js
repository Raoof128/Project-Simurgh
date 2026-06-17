// SPDX-License-Identifier: AGPL-3.0-or-later
// Maps a provider mode to a provider with a generate() method. Core ships mock and
// recorded_fixture only; live throws (no adapter) — a second, defence-in-depth
// guard alongside gatewayEnv.validateProviderSelection.
import { generateMockOutput } from "./mockGatewayProvider.js";
import { generateFromFixture } from "./recordedFixtureProvider.js";

export function getGatewayProvider(providerMode) {
  if (providerMode === "mock") {
    return { name: "mock", generate: (args) => generateMockOutput(args) };
  }
  if (providerMode === "recorded_fixture") {
    return { name: "recorded_fixture", generate: (args) => generateFromFixture(args.fixture) };
  }
  if (providerMode === "live") {
    throw new Error("gateway_live_provider_not_implemented");
  }
  throw new Error("gateway_provider_mode_invalid");
}
