// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 browser — canonical JSON (same algorithm as the shared canonicalJson: recursively sort
// keys, compact separators, UTF-8). Zero external imports so the portable surface runs under a strict
// no-egress CSP in a real browser.
export function canonicalJson(value) {
  const c = (v) =>
    Array.isArray(v)
      ? v.map(c)
      : v && typeof v === "object"
        ? Object.keys(v)
            .sort()
            .reduce((o, k) => ((o[k] = c(v[k])), o), {})
        : v;
  return JSON.stringify(c(value));
}
