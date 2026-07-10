// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — completeness + coverage (plan Task 13, raw 279 = VMP_DERIVED_SUMMARY_MISMATCH; 281
// policy). The declared summary can only equal the recomputed one — an incomplete panel cannot declare
// itself complete, and a small panel cannot understate its silence surface. Coverage publishes the RAW
// heterogeneous_label_vector (typed labels, no normalization) and never an aggregate.
const STATUSES = [
  "evaluated",
  "not_applicable",
  "unsupported_input",
  "capture_failed",
  "missing_capture",
];

function recompute(bundle) {
  const cells = bundle?.cells ?? [];
  const roster = bundle?.roster ?? [];
  const cases = bundle?.corpus?.cases ?? [];
  const histogram = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const c of cells) if (c.status in histogram) histogram[c.status] += 1;

  const representation_complete = cells.length === roster.length * cases.length;
  // applicable-and-supported obligations must all be `evaluated`.
  const evaluation_complete =
    histogram.capture_failed === 0 &&
    histogram.missing_capture === 0 &&
    cells.every(
      (c) =>
        c.status === "evaluated" ||
        c.status === "not_applicable" ||
        c.status === "unsupported_input"
    );

  const semById = new Map(roster.map((m) => [m.member_id, m.decision_semantics]));
  const byCase = new Map(cases.map((c) => [c.case_id, {}]));
  for (const c of cells) {
    if (c.status !== "evaluated") continue;
    const label = c.decision_evidence?.label ?? c.decision_evidence?.normalised_label;
    byCase.get(c.case_id)[c.member_id] = { semantics: semById.get(c.member_id), label };
  }
  const heterogeneous_label_vector = cases.map((c) => ({
    case_id: c.case_id,
    labels: byCase.get(c.case_id),
  }));

  const universe_size = bundle?.detector_universe?.candidates?.length ?? 0;
  const panel_size = roster.length;
  return {
    representation_complete,
    evaluation_complete,
    cell_status_histogram: histogram,
    coverage: {
      universe_size,
      panel_size,
      omission_lower_bound: universe_size - panel_size,
      heterogeneous_label_vector,
    },
  };
}

export function checkCompleteness(bundle) {
  const r = recompute(bundle);
  const c = bundle?.completeness ?? {};
  if (
    c.representation_complete !== r.representation_complete ||
    c.evaluation_complete !== r.evaluation_complete
  )
    return 279;
  for (const s of STATUSES)
    if ((c.cell_status_histogram?.[s] ?? 0) !== r.cell_status_histogram[s]) return 279;

  const cov = bundle?.coverage ?? {};
  if (
    cov.universe_size !== r.coverage.universe_size ||
    cov.panel_size !== r.coverage.panel_size ||
    cov.omission_lower_bound !== r.coverage.omission_lower_bound
  )
    return 279;
  if (
    JSON.stringify(cov.heterogeneous_label_vector) !==
    JSON.stringify(r.coverage.heterogeneous_label_vector)
  )
    return 279;
  return null;
}

// 281: strict policy rejects a truthfully-incomplete panel. attestation truth (raw 0) is separate.
export function evaluatePolicy(bundle) {
  return bundle?.completeness?.evaluation_complete === false ? 281 : null;
}

export { recompute };
