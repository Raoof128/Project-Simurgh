// SPDX-License-Identifier: AGPL-3.0-or-later
// Domain-separated digests (4O spec §5): sha256 over canonicalJson({domain, schema, value}).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { canonicalJson, sha256Hex } from "../../stage4m/core/canonical.mjs";

export function domainDigest(domain, schema, value) {
  if (typeof domain !== "string" || !domain.startsWith("SIMURGH_STAGE4O_")) {
    throw new Error(`unknown_digest_domain: ${domain}`);
  }
  return `sha256:${sha256Hex(canonicalJson({ domain, schema, value }))}`;
}
