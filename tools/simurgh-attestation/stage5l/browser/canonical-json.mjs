// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — browser-safe canonical JSON (no node imports). Mirrors the frozen byte contract: recursively
// sort object keys, compact JSON.stringify. Parity-tested against the Node core.
function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalise(value[key]);
    return out;
  }
  return value;
}
export function canonicalJson(value) {
  return JSON.stringify(canonicalise(value));
}
