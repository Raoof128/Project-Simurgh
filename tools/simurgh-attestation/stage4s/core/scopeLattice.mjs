// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S scope lattice (4S spec §7). Motto: AnthropicSafe First, then ReviewerSafe.
// For scope sets, A ⊑ B iff A ⊆ B — narrower = subset; no other reading is admitted.
// Scopes form a meet-semilattice under set intersection; pathScope is the meet
// (running intersection) along a delegation path.

export function normalizeScope(arr) {
  if (!Array.isArray(arr)) throw new TypeError("scope must be an array");
  const out = new Set();
  for (const s of arr) {
    if (typeof s !== "string" || s.length === 0)
      throw new TypeError("scope entries must be non-empty strings");
    out.add(s.toLowerCase());
  }
  return [...out].sort();
}

export function scopeLeq(a, b) {
  const bSet = new Set(normalizeScope(b));
  return normalizeScope(a).every((s) => bSet.has(s));
}

export function pathScope(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0)
    throw new TypeError("pathScope needs at least one scope");
  let acc = new Set(normalizeScope(scopes[0]));
  for (const s of scopes.slice(1)) {
    const cur = new Set(normalizeScope(s));
    acc = new Set([...acc].filter((x) => cur.has(x)));
  }
  return [...acc].sort();
}
