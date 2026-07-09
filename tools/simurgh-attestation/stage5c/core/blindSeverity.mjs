// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — blind severity (plan Task 12 support). Motto: AnthropicSafe First, then
// ReviewerSafe. A PURE function of the mutated-text digest ONLY — the Lane-B blind child sees
// nothing else (not the mechanism, not the version, not the slip-rate), so severity is
// adversary-independent. Both the evidence builder and the two-process ceremony use this, giving
// byte-identical severities that reconcile to `severity_binding`.
import { VSB_SEVERITY_ENUM } from "../constants.mjs";

// Deterministic map: first hex nibble of the digest → severity bucket. Content-free by design.
export function blindSeverity(mutatedTextDigest) {
  const hex = String(mutatedTextDigest).replace(/^sha256:/, "");
  const n = parseInt(hex[0] || "0", 16);
  return VSB_SEVERITY_ENUM[n % VSB_SEVERITY_ENUM.length];
}

export const BLIND_SEVERITY_BASIS = "blind_digest_only_review";
