// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — browser canonical JSON (same algorithm as the shared canonicalise.mjs: recursively sort
// keys, compact). Kept standalone so the portable verifier has zero external imports (CSP no-egress).
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
