// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the raw-code ledger projection gate.
//
// WHY THIS EXISTS. Both committed Stage 4H exit-map projections were 11 codes behind the shared
// ledger for three stages (finding 5S-F004): the source carried 464-474, the projections stopped at
// 463, and nothing compared them. Regenerating the files repairs the symptom; only a gate that
// compares SETS on every run prevents the next omission.
//
// SETS, NOT COUNTS (Q1-F002). `added`, `removed` and `changed` are reported independently, because
// two codes swapping run levels leaves every count identical.
//
// Pure: the caller reads the files.

export const PROJECTION_REFUSALS = Object.freeze({
  MISSING_FROM_PROJECTION: "codes_missing_from_projection",
  EXTRA_IN_PROJECTION: "codes_extra_in_projection",
  MAPPING_CHANGED: "run_level_mapping_changed",
  EMPTY_INPUT: "empty_input_would_be_vacuous",
});

/**
 * Compare the ledger source against one projection.
 *
 * @param {Record<string|number, number>} source     RUN_LEVEL_BY_RAW
 * @param {Record<string|number, number>} projection a committed exit-map's run_level_by_raw
 * @returns {{ok: boolean, refusal: string|null, added: number[], removed: number[],
 *            changed: Array<{code: number, source: number, projection: number}>,
 *            source_count: number, projection_count: number}}
 */
export function compareProjection(source, projection) {
  const s = new Map(Object.entries(source ?? {}).map(([k, v]) => [Number(k), v]));
  const p = new Map(Object.entries(projection ?? {}).map(([k, v]) => [Number(k), v]));

  // Anti-vacuity: an empty side would make every set comparison trivially agree with nothing.
  if (s.size === 0 || p.size === 0) {
    return {
      ok: false,
      refusal: PROJECTION_REFUSALS.EMPTY_INPUT,
      added: [],
      removed: [],
      changed: [],
      source_count: s.size,
      projection_count: p.size,
    };
  }

  const removed = [...s.keys()].filter((c) => !p.has(c)).sort((a, b) => a - b);
  const added = [...p.keys()].filter((c) => !s.has(c)).sort((a, b) => a - b);
  const changed = [...s.keys()]
    .filter((c) => p.has(c) && p.get(c) !== s.get(c))
    .sort((a, b) => a - b)
    .map((c) => ({ code: c, source: s.get(c), projection: p.get(c) }));

  const refusal = removed.length
    ? PROJECTION_REFUSALS.MISSING_FROM_PROJECTION
    : added.length
      ? PROJECTION_REFUSALS.EXTRA_IN_PROJECTION
      : changed.length
        ? PROJECTION_REFUSALS.MAPPING_CHANGED
        : null;

  return {
    ok: refusal === null,
    refusal,
    added,
    removed,
    changed,
    source_count: s.size,
    projection_count: p.size,
  };
}
