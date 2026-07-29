// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the write surface, parsed from the spec.
//
// Ruling 7: AUTHORITY IS READ, NEVER DECLARED IN THE COMMIT IT JUDGES. Two copies of a declaration
// are two chances to disagree, and the one that disagrees silently is the one nobody is looking at.
// So the rows live in the spec — Annex S for the stage's own surface, Annex M for the three Stage 4H
// ripple paths — and this module parses them.
//
// ORDER IS LOAD-BEARING. The private-key refusal runs BEFORE membership, so no prefix row can
// outvote it. `tools/simurgh-attestation/stage5s/signer/` is inside prefix 5S-S001, and a grant over
// a directory must never become a licence to commit a key that happens to live there.
//
// THE KEY REGEX MATCHES ON PATH SHAPE, NOT ON A NAMING CONVENTION. 5P's audit allowlisted fixture
// keys by digit-free filename, which quietly admitted every name carrying a digit. Extension and
// well-known basenames are what identify key material; how someone chose to name the file is not.

/** Every way the surface is allowed to say no. */
export const SURFACE_REFUSALS = Object.freeze({
  PATH_NOT_IN_SURFACE: "path_not_in_surface",
  OPERATION_NOT_PERMITTED: "operation_not_permitted",
  PRIVATE_KEY_MATERIAL: "private_key_material",
  UNCOMMITTED_NOT_EVALUATED: "uncommitted_changes_not_evaluated",
  NO_ROW_MATCHED: "no_row_matched_a_nonempty_change_set",
});

/** Key material by shape: extension, or a well-known basename. Digits are irrelevant. */
const PRIVATE_KEY_PATH =
  /(?:\.(?:pem|key|p12|pfx|jks|asc|gpg)$)|(?:(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.[A-Za-z0-9]+)?$)/;

const ANNEX_M_ROW =
  /^\|\s*`([^`]+)`\s*\|\s*(add|modify)\s*\|\s*([^|]+?)\s*\|\s*([A-Za-z0-9-]+)\s*\|\s*$/;
const ANNEX_S_ROW =
  /^\|\s*(prefix|exact)\s*\|\s*`([^`]+)`\s*\|\s*(add-modify|add|modify)\s*\|\s*([^|]+?)\s*\|\s*([A-Za-z0-9-]+)\s*\|\s*$/;

/** Slice one annex's own section out of the spec: a table further down is not this annex's authority. */
function annexSection(specText, heading) {
  const text = String(specText ?? "");
  const start = text.indexOf(heading);
  if (start === -1) return "";
  const after = text.slice(start);
  const end = after.indexOf("\n## ", 1);
  return end === -1 ? after : after.slice(0, end);
}

/**
 * Annex M — the three Stage 4H ripple paths, `modify` only.
 * @returns {Array<{kind: "exact", path: string, allowed_operation: string, purpose: string, id: string}>}
 */
export function parseAnnexM(specText) {
  const rows = [];
  for (const line of annexSection(specText, "## Annex M").split("\n")) {
    const m = ANNEX_M_ROW.exec(line.trim());
    if (m) {
      rows.push({
        kind: "exact",
        path: m[1],
        allowed_operation: m[2],
        purpose: m[3].trim(),
        id: m[4],
      });
    }
  }
  return rows;
}

/**
 * Annex S — the stage's own surface, prefix and exact rows.
 * @returns {Array<{kind: string, path: string, allowed_operation: string, purpose: string, id: string}>}
 */
export function parseStageSurface(specText) {
  const rows = [];
  for (const line of annexSection(specText, "## Annex S").split("\n")) {
    const m = ANNEX_S_ROW.exec(line.trim());
    if (m) {
      rows.push({
        kind: m[1],
        path: m[2],
        allowed_operation: m[3],
        purpose: m[4].trim(),
        id: m[5],
      });
    }
  }
  return rows;
}

const permits = (row, op) => row.allowed_operation === "add-modify" || row.allowed_operation === op;
const covers = (row, path) =>
  row.kind === "prefix" ? path.startsWith(row.path) : path === row.path;

/**
 * Judge a change set against the parsed surface. Pure: the caller asks git what changed.
 *
 * @param {{entries: Array<object>, changed: Array<{path: string, op: "add"|"modify"}>,
 *          rangeCommitCount?: number, dirty?: string[]}} input
 * @returns {{ok: boolean, refusals: Array<{reason: string, path?: string, detail?: string}>, matched: number}}
 */
export function judgeChanges(input) {
  const { entries, changed, rangeCommitCount = 0, dirty = [] } = input;
  const refusals = [];
  const R = SURFACE_REFUSALS;
  let matched = 0;

  // ANTI-VACUITY FIRST (Annex S.4, Q1-F004). A range that evaluated nothing while the tree carries
  // changes has not passed — it has not run.
  if (changed.length === 0 && dirty.length > 0) {
    for (const path of dirty) refusals.push({ reason: R.UNCOMMITTED_NOT_EVALUATED, path });
    return { ok: false, refusals, matched };
  }

  for (const { path, op } of changed) {
    // Key material is refused before membership: no row may outvote it.
    if (PRIVATE_KEY_PATH.test(path)) {
      refusals.push({ reason: R.PRIVATE_KEY_MATERIAL, path });
      continue;
    }
    const covering = entries.filter((e) => covers(e, path));
    if (covering.length === 0) {
      refusals.push({ reason: R.PATH_NOT_IN_SURFACE, path });
      continue;
    }
    if (!covering.some((e) => permits(e, op))) {
      refusals.push({
        reason: R.OPERATION_NOT_PERMITTED,
        path,
        detail: `surface permits ${covering.map((e) => e.allowed_operation).join("/")}, change is ${op}`,
      });
      continue;
    }
    matched += 1;
  }

  // A non-empty change set that matched no row at all is a refusal, not an accepted no-op.
  if (changed.length > 0 && matched === 0 && refusals.length === 0) {
    refusals.push({ reason: R.NO_ROW_MATCHED });
  }

  return { ok: refusals.length === 0, refusals, matched };
}

/** Rows whose `rangeCommitCount` is unused today but kept in the signature for the driver's honesty. */
export const __surfaceInternals = Object.freeze({ PRIVATE_KEY_PATH, ANNEX_M_ROW, ANNEX_S_ROW });
