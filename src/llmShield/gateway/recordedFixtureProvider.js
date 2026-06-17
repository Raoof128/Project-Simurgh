// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic provider-shaped fixture replay (NOT a transcript replay). Selection is
// by opaque case_id resolved through a manifest — never a path. Fixtures must be
// hand-authored synthetic (provenance "synthetic") and carry a provider_output_hash
// matching their output; anything else fails closed. No network, no filesystem in
// this module (IO is injected by the caller).
import { PROVIDER_RESPONSE_KINDS } from "./providerTypes.js";
import { hashPrompt } from "../promptNormalise.js";

export const RECORDED_CASE_ID_RE = /^3e_[a-z_]+_\d{3}$/;

export function selectFixtureEntry(caseId, manifest) {
  if (typeof caseId !== "string" || !RECORDED_CASE_ID_RE.test(caseId)) {
    throw new Error("gateway_fixture_selector_invalid");
  }
  const entry = manifest?.[caseId];
  if (!entry) throw new Error("gateway_fixture_not_found");
  return entry;
}

export function validateRecordedFixture(fixture) {
  if (!fixture || typeof fixture !== "object") throw new Error("gateway_fixture_invalid");
  if (fixture.provenance !== "synthetic") throw new Error("gateway_fixture_provenance_invalid");
  if (!PROVIDER_RESPONSE_KINDS.includes(fixture.provider_response_kind)) {
    throw new Error("gateway_fixture_kind_invalid");
  }
  if (typeof fixture.synthetic_provider_output !== "string") {
    throw new Error("gateway_fixture_output_invalid");
  }
  // Frozen-fixture discipline: the committed hash must match the synthetic output.
  if (hashPrompt(fixture.synthetic_provider_output) !== fixture.provider_output_hash) {
    throw new Error("gateway_fixture_hash_mismatch");
  }
  return true;
}

export function generateFromFixture(fixture) {
  return {
    provider: "recorded_fixture",
    provider_mode: "recorded_fixture",
    provider_called: true,
    network_egress_used: false,
    provider_response_kind: fixture.provider_response_kind,
    output_text: fixture.synthetic_provider_output,
    tool_request: fixture.tool_request ?? null,
    usage: { input_tokens_bucket: "unknown", output_tokens_bucket: "unknown" },
    latency_bucket: "0-250ms",
    error_code: fixture.provider_response_kind === "error" ? "synthetic_provider_error" : null,
  };
}
