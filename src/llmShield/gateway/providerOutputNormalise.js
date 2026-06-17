// SPDX-License-Identifier: AGPL-3.0-or-later
// Coerce a provider's raw return into the minimal boundary shape the gateway acts
// on: { kind, text, toolRequest }. Pure, total (never throws), no IO. The raw text
// stays transient — the caller hashes it and runs the output firewall.
import { PROVIDER_RESPONSE_KINDS } from "./providerTypes.js";

export function normaliseProviderOutput(raw = {}) {
  const k = raw.provider_response_kind;
  const kind = PROVIDER_RESPONSE_KINDS.includes(k) ? k : "text";
  const text =
    raw.output_text === undefined || raw.output_text === null ? "" : String(raw.output_text);
  const toolRequest =
    raw.tool_request && typeof raw.tool_request === "object" ? raw.tool_request : null;
  return { kind, text, toolRequest };
}
