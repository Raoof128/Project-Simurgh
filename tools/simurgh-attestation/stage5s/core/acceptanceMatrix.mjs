// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 20 — the acceptance matrix, pinned twice. AnthropicSafe First, then ReviewerSafe.
//
// ONE PIN IS NOT ENOUGH, AND THE REASON IS SPECIFIC (§13, B5). Pin the `case_id` set alone and every
// id can keep its name while its meaning drifts underneath: `5S-XP-MET-INCOMPLETE` goes on existing,
// the set still matches, and the row now expects `no_conflict` where it used to expect a finding.
// Pin only a digest and the opposite failure appears — the digest moves, nobody can say what moved,
// and the reviewer's only options are to trust the diff or re-derive the whole matrix by hand.
//
// So there are two independent commitments, and they fail differently on purpose:
//
//   IDENTITY   the exact set of case ids, with `added` and `removed` computed and printed
//              SEPARATELY. Never a count — Q1-F002 is the standing rule, and "23 cases" is satisfied
//              by deleting one row and adding another.
//   SEMANTICS  a canonical digest over every expected row, and when it moves, FIELD-LEVEL drift:
//              which case, which column, from what to what. A digest that only says "different" is
//              a tripwire; a digest that says which column changed is evidence.
//
// SORTING IS PLAIN CODE-UNIT COMPARISON, NEVER `localeCompare`. The Q1 `::` / `-` disagreement came
// from a locale-aware sort ordering two ids differently on two machines, which makes a "byte-stable"
// pin depend on the reader's locale. `<` on strings is code-unit order and is the same everywhere.

import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical.mjs";

export const MATRIX_DOMAIN = "simurgh.vwq.acceptance-matrix.v1";

export const MATRIX_REFUSALS = Object.freeze({
  IDENTITY_DRIFT: "MATRIX_IDENTITY_DRIFT",
  SEMANTIC_DRIFT: "MATRIX_SEMANTIC_DRIFT",
  MALFORMED: "MATRIX_MALFORMED",
  EMPTY: "MATRIX_EMPTY",
});

/** Code-unit order. Not `localeCompare`, and the header says why. */
const byCodeUnit = (a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * The identity commitment: the exact set of case ids, sorted by code unit.
 *
 * @param {Array<{case_id: string}>} rows
 * @returns {Array<string>}
 */
export function caseIdSet(rows) {
  return [...(Array.isArray(rows) ? rows : [])].map((r) => String(r?.case_id)).sort(byCodeUnit);
}

/**
 * Identity drift, as two separate lists. A single "changed" list would let one deletion and one
 * addition read as a wash, which is exactly the shape a quiet substitution takes.
 *
 * @returns {{ok: boolean, added: Array<string>, removed: Array<string>}}
 */
export function compareIdentity(pinned, actual) {
  const before = new Set(pinned ?? []);
  const after = new Set(caseIdSet(actual));
  const added = [...after].filter((id) => !before.has(id)).sort(byCodeUnit);
  const removed = [...before].filter((id) => !after.has(id)).sort(byCodeUnit);
  return { ok: added.length === 0 && removed.length === 0, added, removed };
}

/**
 * The semantic commitment: one digest over every expected row, rows in code-unit id order and each
 * row canonicalised. Columns are named explicitly so adding an unpinned field to a row cannot
 * silently enter — or silently avoid — the commitment.
 */
export function semanticDigest(rows, columns) {
  const projected = [...(Array.isArray(rows) ? rows : [])]
    .map((row) => {
      const out = {};
      for (const column of columns) out[column] = row?.[column];
      return out;
    })
    .sort((x, y) => byCodeUnit(x.case_id, y.case_id));
  return createHash("sha256")
    .update(`${MATRIX_DOMAIN}\n${canonicalJson(projected)}`, "utf8")
    .digest("hex");
}

/**
 * Field-level drift between a pinned row set and the actual one. Reported for the cases present on
 * both sides — additions and removals are the identity pin's business, and mixing the two is how a
 * report ends up saying everything changed when one row was inserted.
 *
 * @returns {Array<{case_id: string, column: string, pinned: unknown, actual: unknown}>}
 */
export function fieldDrift(pinnedRows, actualRows, columns) {
  const pinnedById = new Map((pinnedRows ?? []).map((r) => [String(r?.case_id), r]));
  const drift = [];
  for (const row of actualRows ?? []) {
    const id = String(row?.case_id);
    const before = pinnedById.get(id);
    if (!before) continue;
    for (const column of columns) {
      const was = canonicalJson(before[column] ?? null);
      const now = canonicalJson(row[column] ?? null);
      if (was !== now) {
        drift.push({ case_id: id, column, pinned: before[column], actual: row[column] });
      }
    }
  }
  return drift.sort((a, b) => byCodeUnit(a.case_id, b.case_id) || byCodeUnit(a.column, b.column));
}

/**
 * Check a matrix against both pins. Pure; never throws.
 *
 * @param {{case_ids: Array<string>, semantic_digest: string, rows?: Array<object>}} pin
 * @param {Array<object>} rows the matrix as built
 * @param {Array<string>} columns the pinned column set
 * @returns {{ok: boolean, refusals: Array<object>, identity: object, semantic: object}}
 */
export function checkMatrix(pin, rows, columns) {
  const refusals = [];
  if (!isPlainObject(pin) || !Array.isArray(rows) || !Array.isArray(columns)) {
    return {
      ok: false,
      refusals: [{ reason: MATRIX_REFUSALS.MALFORMED, detail: "pin, rows or columns absent" }],
      identity: { ok: false, added: [], removed: [] },
      semantic: { ok: false },
    };
  }
  // Anti-vacuity: an empty matrix satisfies every set comparison and every digest over nothing.
  if (rows.length === 0) {
    refusals.push({ reason: MATRIX_REFUSALS.EMPTY, detail: "the matrix has no rows" });
  }

  const identity = compareIdentity(pin.case_ids, rows);
  if (!identity.ok) {
    refusals.push({
      reason: MATRIX_REFUSALS.IDENTITY_DRIFT,
      detail: `added [${identity.added.join(", ")}] removed [${identity.removed.join(", ")}]`,
      added: identity.added,
      removed: identity.removed,
    });
  }

  const digest = semanticDigest(rows, columns);
  const semantic = { ok: digest === pin.semantic_digest, digest, pinned: pin.semantic_digest };
  if (!semantic.ok) {
    // The digest says something moved; the drift says WHAT. A tripwire without the second half
    // leaves a reviewer with nothing to do but re-derive the matrix by hand.
    const drift = fieldDrift(pin.rows, rows, columns);
    refusals.push({
      reason: MATRIX_REFUSALS.SEMANTIC_DRIFT,
      detail:
        drift.length > 0
          ? drift
              .map(
                (d) =>
                  `${d.case_id}.${d.column}: ${JSON.stringify(d.pinned)} → ${JSON.stringify(d.actual)}`
              )
              .join("; ")
          : "the digest moved and no pinned row set was supplied to attribute it",
      drift,
    });
  }

  return { ok: refusals.length === 0, refusals, identity, semantic };
}
