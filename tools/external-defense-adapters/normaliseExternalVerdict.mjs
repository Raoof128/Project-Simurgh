// SPDX-License-Identifier: AGPL-3.0-or-later
// Map an arbitrary external label to the closed Simurgh verdict enum. Pure, deterministic.
// Unknown/empty/non-string labels normalise to error+malformed_output (never throws).
const MAP = Object.freeze({
  safe: "allow",
  allow: "allow",
  pass: "allow",
  ok: "allow",
  unsafe: "block",
  block: "block",
  deny: "block",
  blocked: "block",
  warn: "warn",
  warning: "warn",
  abstain: "abstain",
  unknown: "abstain",
  uncertain: "abstain",
});

export function normaliseExternalVerdict(rawLabel) {
  if (typeof rawLabel !== "string") return { verdict: "error", error_code: "malformed_output" };
  const key = rawLabel.trim().toLowerCase();
  const verdict = MAP[key];
  if (!verdict) return { verdict: "error", error_code: "malformed_output" };
  return { verdict, error_code: "none" };
}
