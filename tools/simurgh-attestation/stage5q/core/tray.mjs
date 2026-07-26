// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the shared stage-tray contract (Task 14).
//
// Sixteen trays, one per attacked stage, all emitting the SAME frozen record. The engine lives here
// once so that a defect in the contract is fixed in one place rather than sixteen — and so that no
// tray can quietly emit a different shape and still look like a tray.
//
// TARGET SELECTION IS A DETERMINISTIC RULE, NEVER A HAND-PICKED LIST (gauntlet P1-25):
//
//     every committed member of this stage whose security_role is one of the four
//     full-obligation roles, ordered by function_id
//
// A hand-picked list is a universe the tray chooses after seeing what it can attack. The rule means
// a tray cannot quietly shrink its own denominator, and `selectTargets` is pure so a reviewer can
// recompute the selection from the commitment alone.
//
// PER-OBLIGATION ROWS, NOT PARALLEL ARRAYS (gauntlet P2-8). Parallel arrays drift silently — one
// gets an entry appended, another does not, and nothing in the data can tell you. A row cannot
// drift against itself. This is also exactly the shape Annex A4 needs to discharge cells.
//
// THE CLEAN-TRAY WORDING IS FROZEN. A tray that found nothing says:
//
//     "No finding was produced by these admissible packs over this frozen target set."
//
// and never "secure", "no vulnerabilities" or "passed". Each of those three claims something about
// the world; the frozen sentence claims something about what was run, which is the only thing a
// tray is in a position to know.

import { ATTACK_CLASSES, OMISSION_REASONS, COVERAGE_STATUSES } from "./constants.mjs";
import { requiredClasses } from "./roleAssignment.mjs";

/** The four roles that carry the full applicable matrix (spec §2.4). */
export const FULL_OBLIGATION_ROLES = Object.freeze([
  "trust_decision",
  "completeness_claim",
  "canonicalisation",
  "code_allocation",
]);

/** The frozen sentence. Compared as an EXACT string, never grepped for. */
export const CLEAN_TRAY_SUMMARY =
  "No finding was produced by these admissible packs over this frozen target set.";

/**
 * The sentence for a tray that ran NO packs at all.
 *
 * Found while building the first real trays: with an empty pack set, CLEAN_TRAY_SUMMARY is
 * VACUOUSLY TRUE. "No finding was produced by these admissible packs" is a true sentence about
 * zero packs, and it reads exactly like a tray that attacked everything and found nothing. That is
 * this stage's signature disease appearing inside the sentence written to prevent it.
 *
 * So an empty tray says something different, and says it plainly.
 */
export const UNRUN_TRAY_SUMMARY =
  "No attack pack has been run against this tray; no discharge is claimed and no finding is implied.";

/** Words a tray may never use about itself, whatever it found. */
export const FORBIDDEN_SUMMARY_TOKENS = Object.freeze([
  "secure",
  "no vulnerabilities",
  "passed",
  "safe",
  "clean bill",
]);

/** The five frozen positive-path values (spec, Task 14). */
export const POSITIVE_PATH_RESULTS = Object.freeze([
  "reproduced",
  "reproduced_with_diff",
  "reproduction_failed",
  "script_absent",
  "environment_unreproducible",
]);

export const TRAY_FIELDS = Object.freeze([
  "tray_id",
  "closure_digest",
  "target_function_ids",
  "applicable_classes",
  "omitted_classes_with_frozen_reason",
  "attack_pack_ids",
  "premise_receipts",
  "finding_ids",
  "coverage_statuses",
  "positive_path_result",
  "obligation_receipts",
  "summary",
]);

/**
 * The deterministic target rule.
 *
 * @param {{members: object[], roles: Map<string,string>, stageId: string}} input
 */
export function selectTargets({ members, roles, stageId }) {
  const roleOf = roles instanceof Map ? (id) => roles.get(id) : (id) => roles[id];
  return members
    .filter((m) => m.stage_id === stageId)
    .filter((m) => FULL_OBLIGATION_ROLES.includes(roleOf(m.function_id)))
    .map((m) => m.function_id)
    .sort();
}

/**
 * Classify a reproduce-script run into the frozen five.
 *
 * `reproduction_failed` is SEPARATE from `reproduced_with_diff` (gauntlet P1-23). "Produced
 * different bytes" and "did not run" are different facts, and merging them hides the worse one —
 * a stage whose reproduce script no longer executes would otherwise be filed as a formatting
 * difference.
 */
export function classifyPositivePath({
  scriptExists,
  exit,
  diff = false,
  environmentUsable = true,
}) {
  if (!scriptExists) return "script_absent";
  if (!environmentUsable) return "environment_unreproducible";
  if (exit !== 0) return "reproduction_failed";
  return diff ? "reproduced_with_diff" : "reproduced";
}

/**
 * Build one tray record.
 *
 * Refuses rather than annotates in three places, because each is a way a tray could report on a
 * universe other than the committed one.
 */
export function buildTray({
  stageId,
  closureDigest,
  committedClosureDigest,
  targets,
  obligationRows = [],
  packIds = [],
  premiseReceipts = [],
  findingIds = [],
  positivePath,
  admissibility,
  closureMemberIds,
}) {
  const problems = [];

  // L2. A tray whose closure digest is not the commitment is describing a different stage.
  if (closureDigest !== committedClosureDigest) {
    return {
      refused: true,
      refusal_reason: "closure_digest_mismatch",
      detail:
        `tray ${stageId} was built against closure ${closureDigest} but the commitment is ` +
        `${committedClosureDigest}. The tray refuses to run rather than reporting on a universe ` +
        `nobody committed.`,
    };
  }

  // A tray cannot invent targets.
  if (closureMemberIds) {
    for (const id of targets) {
      if (!closureMemberIds.has(id)) {
        problems.push({
          kind: "target_outside_closure",
          function_id: id,
          reason: "a tray may only attack members the closure committed at L2",
        });
      }
    }
  }

  const applicable = new Set();
  for (const row of obligationRows) {
    if (row.applicability === "obligated") applicable.add(row.attack_class);
  }

  // Every omission carries a reason from the frozen six.
  const omitted = [];
  for (const attackClass of ATTACK_CLASSES) {
    if (applicable.has(attackClass)) continue;
    const row = obligationRows.find((r) => r.attack_class === attackClass);
    const reason = row?.omission_reason ?? null;
    if (!OMISSION_REASONS.includes(reason)) {
      problems.push({
        kind: "omission_without_frozen_reason",
        attack_class: attackClass,
        omission_reason: reason,
        reason: "free text is not a reason; the §4.2 enum is the whole vocabulary",
      });
    }
    omitted.push({ attack_class: attackClass, omission_reason: reason });
  }

  // L4. No attacked_pass for a class with no Task 12 mutation receipt.
  const receipts = [];
  const statuses = [];
  for (const row of obligationRows) {
    if (!COVERAGE_STATUSES.includes(row.discharge_status) && row.discharge_status !== null) {
      problems.push({
        kind: "unknown_discharge_status",
        function_id: row.function_id,
        status: row.discharge_status,
      });
    }
    if (
      row.discharge_status === "attacked_pass" &&
      admissibility &&
      !admissibility.isAdmissible(row.attack_class)
    ) {
      problems.push({
        kind: "attacked_pass_without_mutation_receipt",
        function_id: row.function_id,
        attack_class: row.attack_class,
        reason:
          `no valid Task 12 receipt discharges ${row.attack_class}, so a pass over it means only ` +
          `"nothing happened" — which is also what a broken detector says (L4)`,
      });
    }
    receipts.push({
      function_id: row.function_id,
      attack_class: row.attack_class,
      pack_id: row.pack_id ?? null,
      premise_receipt_digest: row.premise_receipt_digest ?? null,
      observed_outcome: row.observed_outcome ?? null,
      discharge_status: row.discharge_status ?? null,
      finding_ids: row.finding_ids ?? [],
    });
    if (row.discharge_status) statuses.push(row.discharge_status);
  }

  if (!POSITIVE_PATH_RESULTS.includes(positivePath?.result)) {
    problems.push({
      kind: "unknown_positive_path_result",
      result: positivePath?.result ?? null,
      reason: "the positive path proves the attacks did not break the thing they attacked",
    });
  }

  const record = {
    tray_id: `tray-${stageId}`,
    closure_digest: closureDigest,
    target_function_ids: [...targets].sort(),
    applicable_classes: [...applicable].sort(),
    omitted_classes_with_frozen_reason: omitted,
    attack_pack_ids: [...packIds].sort(),
    premise_receipts: premiseReceipts,
    finding_ids: [...findingIds].sort(),
    coverage_statuses: countBy(statuses),
    positive_path_result: positivePath,
    obligation_receipts: receipts,
    // An empty pack set gets its own sentence. See UNRUN_TRAY_SUMMARY: the clean sentence is
    // vacuously true over zero packs and would read as a thorough tray that found nothing.
    summary:
      packIds.length === 0
        ? UNRUN_TRAY_SUMMARY
        : findingIds.length === 0
          ? CLEAN_TRAY_SUMMARY
          : `${findingIds.length} finding(s) frozen.`,
  };

  return { refused: false, ok: problems.length === 0, problems, record };
}

function countBy(values) {
  const out = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

/**
 * Validate the SUMMARY FIELD only (gauntlet P2-7).
 *
 * Not every byte of the report. A raw tray record legitimately contains file paths and quoted
 * historical text carrying words like "passed", and a whole-file grep would either fire falsely on
 * every run or be quietly relaxed until it fired never. The claim lives in one field, so one field
 * is what is checked.
 */
export function validateSummary(summary) {
  const problems = [];
  if (typeof summary !== "string" || summary.length === 0) {
    return { ok: false, problems: [{ kind: "missing_summary" }] };
  }
  const lower = summary.toLowerCase();
  for (const token of FORBIDDEN_SUMMARY_TOKENS) {
    if (lower.includes(token)) {
      problems.push({
        kind: "forbidden_summary_token",
        token,
        reason:
          `"${token}" claims something about the world. A tray knows only what it ran, so a clean ` +
          `tray says exactly: "${CLEAN_TRAY_SUMMARY}"`,
      });
    }
  }
  return { ok: problems.length === 0, problems };
}

/** The classes a target must face, from its role. Re-exported so trays need not reach further. */
export function classesFor(role) {
  return requiredClasses(role);
}
