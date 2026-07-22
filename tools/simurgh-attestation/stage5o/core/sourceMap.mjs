// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §13 — the prior-art and novelty source map, and the gate that keeps it honest.
//
// An anti-fabrication project must not carry a fuzzy citation, so the discipline is mechanical
// rather than aspirational: a novelty claim with no pinned source is a REJECTED claim; an entry
// missing a required field is rejected; a missing quote must carry a STATED reason, because a
// silently absent quote is exactly the fuzzy citation this gate exists to prevent; and an unknown
// classification fails CLOSED.
//
// The gate also rejects a map that claims its own sweep was EXHAUSTIVE. No sweep proves absence —
// "an absence found by a narrow search is not an absence" is this stage's own hard-won law, and a
// prior-art map is the last place to forget it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SOURCE_CLASSIFICATIONS = Object.freeze([
  "prior_art_construction", // a construction Stage 5O USES and did not invent
  "prior_art_field", // the established field a mechanism sits in
  "classical_mathematics", // no single primary claimant
  "novelty_claim", // what Stage 5O asserts is new — must be falsifiable
]);

export const REQUIRED_ENTRY_FIELDS = Object.freeze([
  "id",
  "title",
  "version_or_date",
  "url",
  "retrieval_date",
  "exact_quote",
  "quote_unavailable_reason",
  "classification",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateEntry(entry) {
  if (entry === null || typeof entry !== "object") return { ok: false, detail: "shape" };
  for (const f of REQUIRED_ENTRY_FIELDS) {
    if (!(f in entry)) return { ok: false, detail: `missing:${f}` };
  }
  if (!SOURCE_CLASSIFICATIONS.includes(entry.classification)) {
    return { ok: false, detail: "classification" };
  }
  for (const f of ["id", "title", "version_or_date"]) {
    if (typeof entry[f] !== "string" || entry[f].length === 0) return { ok: false, detail: f };
  }
  // A URL may be null ONLY for classical mathematics with a stated reason. Pointing a reader at an
  // unrelated document is worse than pointing them nowhere: a placeholder URL IS a fuzzy citation,
  // which is the one thing this map exists to make impossible.
  const hasUrl = typeof entry.url === "string" && entry.url.length > 0;
  if (!hasUrl) {
    if (entry.classification !== "classical_mathematics" || entry.url !== null) {
      return { ok: false, detail: "url" };
    }
  }
  if (!ISO_DATE.test(entry.retrieval_date)) return { ok: false, detail: "retrieval_date" };
  // A quote may be absent, but only with a stated reason. Silence is the fuzzy citation.
  const hasQuote = typeof entry.exact_quote === "string" && entry.exact_quote.length > 0;
  const hasReason =
    typeof entry.quote_unavailable_reason === "string" && entry.quote_unavailable_reason.length > 0;
  if (!hasQuote && !hasReason) return { ok: false, detail: "quote_absent_without_reason" };
  return { ok: true };
}

/**
 * The map-level gate. Returns every violation rather than the first, because a source map is read
 * whole by a reviewer and a one-at-a-time gate would take as many rounds as it has defects.
 */
export function sourceMapGate(map) {
  const violations = [];
  if (map === null || typeof map !== "object")
    return { ok: false, violations: [{ detail: "shape" }] };

  if (map.sweep_is_exhaustive !== false) {
    violations.push({ detail: "exhaustiveness_claimed" });
  }
  if (!Array.isArray(map.sweep_scope) || map.sweep_scope.length === 0) {
    violations.push({ detail: "sweep_scope_undeclared" });
  }
  const entries = Array.isArray(map.entries) ? map.entries : [];
  const ids = new Set();
  for (const e of entries) {
    const v = validateEntry(e);
    if (!v.ok) violations.push({ id: e?.id, detail: v.detail });
    if (ids.has(e?.id)) violations.push({ id: e?.id, detail: "duplicate_entry_id" });
    ids.add(e?.id);
  }
  const claims = Array.isArray(map.claims) ? map.claims : [];
  for (const c of claims) {
    if (!Array.isArray(c?.sources) || c.sources.length === 0) {
      violations.push({ id: c?.id, detail: "claim_without_source" });
      continue;
    }
    for (const s of c.sources) {
      if (!ids.has(s)) violations.push({ id: c.id, detail: `dangling_source:${s}` });
    }
    if (typeof c.falsifiable_by !== "string" || c.falsifiable_by.length === 0) {
      violations.push({ id: c.id, detail: "claim_not_falsifiable" });
    }
  }
  return { ok: violations.length === 0, violations };
}

export function loadSourceMap() {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL("./stage5o-source-map.json", import.meta.url)), "utf8")
  );
}
