// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — dependency-free canonical JSON (byte-identical to tools/simurgh-attestation/canonicalise.mjs)
// for the browser tier. Recursively sorts object keys, then JSON.stringify.
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
