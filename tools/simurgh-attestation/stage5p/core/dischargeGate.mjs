// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.12 — the Typed Outcome Discharge Gate.
//
// A typed outcome that no lane ever exercises is an unproven claim wearing a taxonomy's clothes.
// This module is the frozen law made executable: every typed outcome must appear EXACTLY ONCE in the
// discharge ledger under EXACTLY ONE status, and each status must carry the evidence that status
// requires. A prose assertion, the mere existence of an implementation branch, or any untrusted
// model output is not a discharge.
//
// Two phases, deliberately different questions:
//   draft   — is the ledger COMPLETE and well-formed? (`pending` is legal mid-build)
//   release — is the stage READY? (`pending` is the explicit absence of a discharge, and is fatal)
//
// Pure: no I/O, no clock, no fixtures. It validates a ledger someone else built by execution, which
// is what keeps the law stable while the discharge state moves underneath it.

export const RELEASE_STATUSES = Object.freeze([
  "witnessed",
  "mechanically_unreachable",
  "reserved",
]);

// `pending` is DEVELOPMENT-ONLY. It is not a fourth way to discharge an outcome; it is the recorded
// absence of one, and release mode rejects it.
export const DISCHARGE_STATUSES = Object.freeze([...RELEASE_STATUSES, "pending"]);

export const DISCHARGE_PHASES = Object.freeze(["draft", "release"]);

// Which evidence fields belong to which status. A row carrying a field owned by a DIFFERENT status
// is claiming two discharges at once, which §2.12 forbids. Fields owned by nobody are ignored:
// the gate polices status confusion, not vocabulary size.
const STATUS_FIELDS = Object.freeze({
  witnessed: Object.freeze([
    "lane",
    "fixture_ids",
    "expected_check_id",
    "observed_check_id",
    "observed_policy_outcome",
    "premise_receipt",
  ]),
  mechanically_unreachable: Object.freeze(["proof_name", "bounded_scope", "reproducible_result"]),
  reserved: Object.freeze([
    "signed_non_claim",
    "amendment_trigger",
    "unavailable_in_lanes",
    "reason",
  ]),
  pending: Object.freeze([]),
});

const nonEmptyString = (v) => typeof v === "string" && v.length > 0;
const nonEmptyArray = (v) => Array.isArray(v) && v.length > 0;

/**
 * @param ledger {{ type, phase, outcomes: row[] }}
 * @param opts   {{ phase: "draft"|"release", typedOutcomes: string[] }}
 * @returns {{ ok, phase, problems, counts, pending }}
 */
export function validateDischargeLedger(ledger, opts) {
  const problems = [];
  const phase = opts?.phase;
  const typedOutcomes = Array.isArray(opts?.typedOutcomes) ? opts.typedOutcomes : [];

  if (!DISCHARGE_PHASES.includes(phase)) {
    problems.push({ kind: "unknown_phase", value: phase ?? null });
  }
  const release = phase === "release";

  const rows =
    ledger && typeof ledger === "object" && !Array.isArray(ledger) && Array.isArray(ledger.outcomes)
      ? ledger.outcomes
      : null;
  if (!rows) {
    problems.push({ kind: "malformed_ledger" });
    return { ok: false, phase: phase ?? null, problems, counts: {}, pending: [] };
  }
  if (nonEmptyString(ledger.phase) && DISCHARGE_PHASES.includes(phase) && ledger.phase !== phase) {
    problems.push({ kind: "ledger_phase_mismatch", declared: ledger.phase, requested: phase });
  }

  // --- one row per outcome, exactly ------------------------------------------------------------
  const byOutcome = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !nonEmptyString(row.policy_outcome)) {
      problems.push({ kind: "malformed_row", row });
      continue;
    }
    if (!byOutcome.has(row.policy_outcome)) byOutcome.set(row.policy_outcome, []);
    byOutcome.get(row.policy_outcome).push(row);
  }
  for (const outcome of typedOutcomes) {
    if (!byOutcome.has(outcome)) problems.push({ kind: "outcome_not_discharged", outcome });
  }
  for (const [outcome, group] of byOutcome) {
    if (!typedOutcomes.includes(outcome)) {
      problems.push({ kind: "unknown_policy_outcome", outcome });
    }
    if (group.length > 1) {
      problems.push({
        kind: "outcome_discharged_more_than_once",
        outcome,
        count: group.length,
        statuses: [...new Set(group.map((r) => r.status))].sort(),
      });
    }
  }

  // --- per-row status and evidence -------------------------------------------------------------
  const counts = Object.fromEntries(DISCHARGE_STATUSES.map((s) => [s, 0]));
  const pending = [];

  for (const row of rows) {
    if (!row || typeof row !== "object" || !nonEmptyString(row.policy_outcome)) continue;
    const { status, policy_outcome: outcome } = row;

    if (!DISCHARGE_STATUSES.includes(status)) {
      problems.push({ kind: "unknown_status", outcome, value: status ?? null });
      continue;
    }
    counts[status] += 1;
    if (status === "pending") pending.push(outcome);

    // A row may wear exactly one hat.
    for (const [other, fields] of Object.entries(STATUS_FIELDS)) {
      if (other === status) continue;
      for (const field of fields) {
        if (field in row && !STATUS_FIELDS[status].includes(field)) {
          problems.push({ kind: "row_claims_two_statuses", outcome, status, foreign_field: field });
        }
      }
    }

    if (status === "witnessed") {
      // Draft already requires the two things that separate a witness from an assertion.
      if (!nonEmptyArray(row.fixture_ids)) {
        problems.push({ kind: "witnessed_without_fixture", outcome });
      }
      if (!nonEmptyString(row.premise_receipt)) {
        problems.push({ kind: "witnessed_without_premise", outcome });
      }
      if (release) {
        if (!nonEmptyString(row.lane)) problems.push({ kind: "witnessed_without_lane", outcome });
        if (!nonEmptyString(row.expected_check_id)) {
          problems.push({ kind: "witnessed_without_expected_check", outcome });
        }
        // The row must agree with what the verifier ACTUALLY returned. A fixture register that
        // disagrees with execution is the exact defect this stage caught by fault injection.
        if (
          row.observed_policy_outcome !== outcome ||
          row.observed_check_id !== row.expected_check_id
        ) {
          problems.push({
            kind: "verifier_disagrees_with_row",
            outcome,
            expected_check_id: row.expected_check_id ?? null,
            observed_check_id: row.observed_check_id ?? null,
            observed_policy_outcome: row.observed_policy_outcome ?? null,
          });
        }
      }
    }

    if (release && status === "pending") {
      problems.push({ kind: "pending_is_not_a_release_discharge", outcome });
    }

    if (release && status === "mechanically_unreachable") {
      // Prose is not a proof. A named artifact, its bounded scope, and a reproducible result.
      if (
        !nonEmptyString(row.proof_name) ||
        !nonEmptyString(row.bounded_scope) ||
        !nonEmptyString(row.reproducible_result)
      ) {
        problems.push({ kind: "unreachable_without_proof", outcome });
      }
    }

    if (release && status === "reserved") {
      if (!nonEmptyString(row.signed_non_claim)) {
        problems.push({ kind: "reserved_without_non_claim", outcome });
      }
      if (!nonEmptyString(row.amendment_trigger)) {
        problems.push({ kind: "reserved_without_amendment_trigger", outcome });
      }
      if (!nonEmptyArray(row.unavailable_in_lanes)) {
        problems.push({ kind: "reserved_without_lanes", outcome });
      }
      if (!nonEmptyString(row.reason)) {
        problems.push({ kind: "reserved_without_reason", outcome });
      }
    }
  }

  return {
    ok: problems.length === 0,
    phase: phase ?? null,
    problems,
    counts,
    pending: pending.sort(),
  };
}
