// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 27 — the parity manifest, written BEFORE the mirrors.
//
// The order is the point. A manifest written after the mirrors is a description of whatever they
// happened to implement; written first, it is a contract they have to meet, and a surface a mirror
// quietly skipped is a set difference rather than a thing nobody noticed.
//
// WHAT IS SHARED, AND WHAT IS DELIBERATELY NOT. The mirrors reproduce the parts of this stage that
// are pure functions of committed bytes: canonicalisation, both digests, the compatibility relation,
// ancestry, quorum arithmetic, typed status rendering. They do NOT reproduce signature verification,
// the ordered evaluator, the ceremony, or anything that reads a file — a mirror that needed a
// private key or a directory layout would be testing the harness, not the algebra.

export const PARITY_SURFACES = Object.freeze([
  {
    id: "canonical_json",
    symbol: "canonicalJson",
    statement: "one value, one byte string, on every runtime",
  },
  {
    id: "checkpoint_body_digest",
    symbol: "checkpointBodyDigest",
    statement: "canonical checkpoint fields with NO signature material (§2.2)",
  },
  {
    id: "checkpoint_envelope_digest",
    symbol: "checkpointEnvelopeDigest",
    statement: "body plus producer signature, profile and committed key digest (§2.2)",
  },
  {
    id: "compatibility_relation",
    symbol: "compare",
    statement: "the four §2.4 verdicts over two views and an injected ancestry oracle",
  },
  {
    id: "ancestry",
    symbol: "proveAncestry",
    statement: "transitive ancestry with cycle rejection and the invalid/unprovable line",
  },
  {
    id: "quorum_arithmetic",
    symbol: "tally",
    statement: "distinct eligible witnesses after exclusion and collapse, against threshold_q",
  },
  {
    id: "typed_status_rendering",
    symbol: "comparisonStatusOf",
    statement: "the four comparison statuses and the five typed absence variants (§3.6)",
  },
]);

/** What the mirrors are NOT asked to reproduce, recorded so the gap is declared rather than found. */
export const OUT_OF_PARITY_SCOPE = Object.freeze([
  {
    id: "signature_verification",
    reason:
      "each runtime uses its own crypto provider; the ALGEBRA is shared, the primitive is not",
  },
  {
    id: "ordered_evaluator",
    reason:
      "the evaluator reads a bundle shape and orchestrates; the surfaces it calls are each in parity",
  },
  {
    id: "ceremony",
    reason: "process separation is a Node concern and has no browser or Python analogue",
  },
  {
    id: "file_io",
    reason: "a mirror that read files would be testing the harness rather than the algebra",
  },
]);

export const PARITY_IDS = Object.freeze(PARITY_SURFACES.map((s) => s.id).sort());

/**
 * Compare a mirror's reported surface set against the manifest. Pure.
 *
 * @returns {{ok: boolean, missing: Array<string>, extra: Array<string>}}
 */
export function checkCoverage(reportedIds) {
  const reported = new Set(Array.isArray(reportedIds) ? reportedIds : []);
  const missing = PARITY_IDS.filter((id) => !reported.has(id));
  const extra = [...reported].filter((id) => !PARITY_IDS.includes(id)).sort();
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}
