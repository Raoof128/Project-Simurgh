// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared Stage 3E gateway enums. Kept tiny and frozen so modes/kinds are auditable.
export const GATEWAY_PROVIDER_MODES = Object.freeze(["mock", "recorded_fixture", "live"]);
export const GATEWAY_PROVIDERS_CORE = Object.freeze(["mock", "recorded_fixture"]);
export const PROVIDER_RESPONSE_KINDS = Object.freeze([
  "text",
  "tool_request",
  "refusal",
  "error",
  "leaky_text",
]);
