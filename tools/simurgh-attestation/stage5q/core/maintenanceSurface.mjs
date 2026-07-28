// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Annex A5 — the `maintenance` write surface.
//
// §14.2 assigns 5Q-F001's repair to Q1; §6.1 refuses the file with the words "repairing it is Q1's
// job"; and the Q0→Q1 transition validator refuses Q1 today (T3 fails, T7 needs --manifest). Those
// three correct statements form a deadlock, and the two ways out that need no annex — disabling the
// gate, or filing authorised work as a violation — are both worse than the deadlock.
//
// THE SURFACE IS PARSED FROM THE SPEC, NEVER RE-DECLARED HERE. 5Q's own reproduce script says it:
// "Two copies of a declaration are two chances to disagree — and the one that disagrees silently is
// the one nobody is looking at." The gate demanded the paths be named in the spec, so the spec is
// where they are named and where this reads them from.
//
// AUTHORITY PRECEDES ACTION, AND IT IS CHECKED RATHER THAN ASSERTED. The commit carrying A5 must be
// a strict ancestor of the first commit touching any path A5 authorises. A permission written after
// the crossing is not a permission.

/** Every way the maintenance surface is allowed to say no. */
export const MAINTENANCE_REFUSALS = Object.freeze({
  EMPTY_RANGE: "empty_range",
  PATH_NOT_IN_SURFACE: "path_not_in_maintenance_surface",
  OPERATION_NOT_PERMITTED: "operation_not_permitted",
  AUTHORITY_DOES_NOT_PRECEDE: "authority_does_not_precede_action",
  FROZEN_SECTIONS_MODIFIED: "frozen_sections_modified",
  TRANSITION_MODIFIED: "transition_conditions_modified",
  Q1_CLAIMED: "q1_authorisation_claimed",
  UNCOMMITTED_NOT_EVALUATED: "uncommitted_changes_not_evaluated",
  ANNEX_ABSENT: "maintenance_annex_absent",
});

const ROW = /^\|\s*`([^`]+)`\s*\|\s*(add|modify)\s*\|\s*([^|]+?)\s*\|\s*([A-Za-z0-9-]+)\s*\|\s*$/;

/**
 * Parse Annex A5's exact-path table out of the spec text.
 *
 * @returns {{present: boolean, entries: Array<{path: string, op: string, purpose: string, id: string}>}}
 */
export function parseMaintenanceSurface(specText) {
  const text = String(specText ?? "");
  const start = text.indexOf("## Annex A5");
  if (start === -1) return { present: false, entries: [] };
  // Bounded to A5's own section: a table further down the document is not this annex's authority.
  const after = text.slice(start);
  const end = after.indexOf("\n## ", 1);
  const section = end === -1 ? after : after.slice(0, end);

  const entries = [];
  for (const line of section.split("\n")) {
    const m = ROW.exec(line.trim());
    if (m) entries.push({ path: m[1], op: m[2], purpose: m[3].trim(), id: m[4] });
  }
  return { present: entries.length > 0, entries };
}

/**
 * Judge a set of changes against the maintenance surface.
 *
 * @param {{
 *   entries: Array<{path: string, op: string}>,
 *   outsideQ0: Array<{path: string, op: "add"|"modify"}>,
 *   rangeCommitCount: number,
 *   uncommittedPaths?: string[],
 *   frozenSectionsIntact?: boolean,
 *   transitionIntact?: boolean,
 *   q1Authorised?: boolean,
 *   authorityPrecedes?: boolean,
 * }} input
 * @returns {{ok: boolean, refusals: Array<{reason: string, path?: string, detail?: string}>}}
 */
export function judgeMaintenance(input) {
  const {
    entries,
    outsideQ0,
    rangeCommitCount,
    uncommittedPaths = [],
    frozenSectionsIntact = true,
    transitionIntact = true,
    q1Authorised = false,
    authorityPrecedes = true,
  } = input;
  const refusals = [];
  const R = MAINTENANCE_REFUSALS;

  if (!entries || entries.length === 0) {
    return { ok: false, refusals: [{ reason: R.ANNEX_ABSENT }] };
  }
  // Anti-vacuity. The §6.1 gate diffs a commit range, and during this very repair it was run with
  // the work uncommitted, evaluated nothing, and printed a pass.
  if (!rangeCommitCount) refusals.push({ reason: R.EMPTY_RANGE });

  const authorised = new Map(entries.map((e) => [e.path, e.op]));
  for (const { path, op } of outsideQ0) {
    if (!authorised.has(path)) {
      refusals.push({ reason: R.PATH_NOT_IN_SURFACE, path });
      continue;
    }
    if (authorised.get(path) !== op) {
      refusals.push({
        reason: R.OPERATION_NOT_PERMITTED,
        path,
        detail: `annex permits ${authorised.get(path)}, change is ${op}`,
      });
    }
  }

  for (const path of uncommittedPaths) {
    if (authorised.has(path)) refusals.push({ reason: R.UNCOMMITTED_NOT_EVALUATED, path });
  }

  if (!authorityPrecedes) refusals.push({ reason: R.AUTHORITY_DOES_NOT_PRECEDE });
  if (!frozenSectionsIntact) refusals.push({ reason: R.FROZEN_SECTIONS_MODIFIED });
  if (!transitionIntact) refusals.push({ reason: R.TRANSITION_MODIFIED });
  if (q1Authorised) refusals.push({ reason: R.Q1_CLAIMED });

  return { ok: refusals.length === 0, refusals };
}
