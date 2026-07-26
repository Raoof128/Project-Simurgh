// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 coverage and discharge ledger. L1 MADE MECHANICAL, BOTTOM-UP (Annex A4.3).
//
// L1 is "No Unexamined Function". The original design recorded a `coverage_status` per member and
// inferred class coverage from it — and that inference is exactly what permitted a false discharge:
// one R3 pack against one function could stand for R3 across every R3-obligated function in a tray,
// and nothing in the data would look wrong. Tray complete, ledger complete, statuses populated.
//
// So the direction is inverted. CELLS ARE DISCHARGED; MEMBER STATUS IS DERIVED:
//
//     attacked_pass                 every obligated cell discharged, none found
//     finding_frozen                any cell produced a finding
//     mechanically_unreachable      every cell omitted for a mechanical reason
//     delegated_to_attacked_caller  delegation validates (§2.7)
//
// A MEMBER STATUS THAT ARRIVES AS INPUT IS REFUSED, not overwritten. Overwriting would make the
// caller's claim invisible; refusing makes it a named problem. There is no path in this file by
// which a status is asserted rather than computed.
//
// AND A MEMBER THAT DERIVES TO NOTHING IS NOT DEFAULTED. `null` is the honest answer for a member
// whose obligated cells were never attacked, and it propagates: the ledger reports
// `l1_certified: false` and says how many members are unstatused. A coverage ledger that quietly
// filled those in with `attacked_pass` would be this stage's own signature disease — the false
// green — committed by the artifact built to detect it.

import { createHash } from "node:crypto";
import { COVERAGE_STATUSES, OMISSION_REASONS, ATTACK_CLASSES } from "./constants.mjs";
import { obligationId } from "./obligations.mjs";

export const COVERAGE_DOMAIN = "simurgh.vsr.coverage-ledger.v1";
export const OVERLAY_DOMAIN = "simurgh.vsr.discharge-overlay.v1";

/**
 * The omission reasons that make a member MECHANICALLY unreachable.
 *
 * `delegated` is deliberately absent. A delegated cell is not unreachable — it is reachable through
 * a caller that carries the obligation, and the §2.7 delegation rules decide whether that caller
 * was actually attacked. Folding `delegated` in here would let a member discharge itself by
 * pointing at a caller nobody ever touched, which is the whole failure `validateDelegation` exists
 * to catch.
 */
export const MECHANICAL_OMISSION_REASONS = Object.freeze(
  OMISSION_REASONS.filter((r) => r !== "delegated")
);

/** A discharge that may stand behind an `attacked_pass`. Anything else is not a pass. */
export const PASSING_OUTCOMES = Object.freeze(["attacked_pass"]);

const digest = (domain, value) =>
  createHash("sha256")
    .update(Buffer.from(domain, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(JSON.stringify(value), "utf8"))
    .digest("hex");

/**
 * Index the discharge records by obligation id.
 *
 * Two discharges for one cell is refused rather than last-wins. Last-wins would let a second,
 * friendlier run overwrite a first one — outcome shopping at cell granularity, and invisible.
 */
export function indexDischarges(discharges) {
  const byObligation = new Map();
  const problems = [];
  for (const d of discharges) {
    const id =
      d.obligation_id ?? obligationId({ functionId: d.function_id, attackClass: d.attack_class });
    if (byObligation.has(id)) {
      problems.push({
        kind: "duplicate_discharge",
        obligation_id: id,
        function_id: d.function_id,
        attack_class: d.attack_class,
        reason:
          "one cell, two discharges. Refused rather than resolved by order: last-wins lets a " +
          "second run overwrite the first, which is outcome shopping at cell granularity",
      });
      continue;
    }
    byObligation.set(id, { ...d, obligation_id: id });
  }
  return { byObligation, problems };
}

/**
 * Derive one member's status from its cells. PURE — no defaults, no fallbacks.
 *
 * Returns `{ status, reason, blocking }`. `status` is null when nothing derives, and `blocking`
 * names the cells that stopped a pass so the answer is actionable rather than merely negative.
 */
export function deriveMemberStatus({ cells, discharges, delegatesTo = null }) {
  if (cells.length === 0) {
    return {
      status: null,
      reason:
        "no obligation cells. A member with no cells has not been considered, and the absent " +
        "cell and the never-considered cell must never look the same (R7)",
      blocking: [],
    };
  }

  const rows = cells.map((cell) => ({
    cell,
    discharge: discharges.get(cell.obligation_id) ?? null,
  }));

  // 1. A finding beats everything. It is the strongest thing the ledger can say about a member,
  //    and it is never softened by other cells passing.
  const withFindings = rows.filter((r) => (r.discharge?.finding_ids ?? []).length > 0);
  if (withFindings.length > 0) {
    return {
      status: "finding_frozen",
      reason: `${withFindings.length} cell(s) produced a finding`,
      blocking: [],
    };
  }

  const obligated = rows.filter((r) => r.cell.applicability === "obligated");
  const omitted = rows.filter((r) => r.cell.applicability === "omitted");

  // 2. Mechanically unreachable — EVERY cell omitted, and every reason from the mechanical set.
  //    Checked before the pass rule because a member with no obligations cannot pass anything.
  if (obligated.length === 0) {
    const nonMechanical = omitted.filter(
      (r) => !MECHANICAL_OMISSION_REASONS.includes(r.cell.omission_reason)
    );
    if (nonMechanical.length === 0) {
      return {
        status: "mechanically_unreachable",
        reason: `all ${omitted.length} cells omitted for mechanical reasons`,
        blocking: [],
      };
    }
    // Every cell is omitted but at least one is `delegated`, which is a routing decision rather
    // than a mechanical fact. Fall through to delegation.
    if (delegatesTo) {
      return {
        status: "delegated_to_attacked_caller",
        reason: `discharged through attacked caller ${delegatesTo}`,
        blocking: [],
      };
    }
    return {
      status: null,
      reason:
        `${nonMechanical.length} cell(s) omitted as 'delegated' with no validated caller. ` +
        `Delegation is a claim about a caller that WAS attacked, not a way to have no obligations`,
      blocking: nonMechanical.map((r) => r.cell.obligation_id),
    };
  }

  // 3. attacked_pass — EVERY obligated cell discharged. This is the P0-5 rule: one undischarged
  //    cell blocks the member even if every other cell passed, because the member-level claim is
  //    over all of its obligations and not over the ones that happened to be attacked.
  const undischarged = obligated.filter((r) => !r.discharge);
  const notPassing = obligated.filter(
    (r) => r.discharge && !PASSING_OUTCOMES.includes(r.discharge.discharge_status)
  );
  if (undischarged.length === 0 && notPassing.length === 0) {
    return {
      status: "attacked_pass",
      reason: `all ${obligated.length} obligated cell(s) discharged with no finding`,
      blocking: [],
    };
  }

  // 4. Delegation, last. A member with live obligations may still discharge through an attacked
  //    caller, but only if delegation actually validated — which is decided elsewhere and passed
  //    in, never assumed here.
  if (delegatesTo && undischarged.length === obligated.length) {
    return {
      status: "delegated_to_attacked_caller",
      reason: `discharged through attacked caller ${delegatesTo}`,
      blocking: [],
    };
  }

  return {
    status: null,
    reason:
      `${undischarged.length} of ${obligated.length} obligated cell(s) undischarged` +
      (notPassing.length ? `, ${notPassing.length} discharged without passing` : ""),
    blocking: [...undischarged, ...notPassing].map((r) => r.cell.obligation_id),
  };
}

/**
 * Build the ledger.
 *
 * @param {object} input
 * @param {Array} input.members            committed closure rows (function_id, ...)
 * @param {Array} input.cells              the committed obligation matrix
 * @param {Array} input.discharges         cell-level discharge records
 * @param {object} input.admissibility     `{ isAdmissible(attackClass) }` from Task 12 receipts
 * @param {Map}   input.delegation         function_id -> validated caller, or empty
 */
export function buildCoverageLedger({
  members,
  cells,
  discharges,
  admissibility = null,
  delegation = new Map(),
}) {
  const problems = [];

  // A status supplied as input is a claim, and this file computes claims rather than accepting
  // them. Refused loudly, because a silently-ignored input reads to its author as an accepted one.
  for (const m of members) {
    if (m.coverage_status !== undefined) {
      problems.push({
        kind: "member_status_written_directly",
        function_id: m.function_id,
        reason:
          "coverage_status is DERIVED from cells (Annex A4.3). A member status computed without " +
          "its cells is the inference that permitted the false discharge P0-5 names",
      });
    }
  }

  const seen = new Set();
  for (const m of members) {
    if (seen.has(m.function_id)) {
      problems.push({
        kind: "duplicate_member",
        function_id: m.function_id,
        reason: "a member counted twice can be discharged once and reported twice",
      });
    }
    seen.add(m.function_id);
  }

  const { byObligation, problems: dischargeProblems } = indexDischarges(discharges);
  problems.push(...dischargeProblems);

  for (const [, d] of byObligation) {
    if (!COVERAGE_STATUSES.includes(d.discharge_status)) {
      problems.push({
        kind: "unknown_discharge_status",
        obligation_id: d.obligation_id,
        status: d.discharge_status,
        reason: `the vocabulary is exactly four (§2.7); a fifth value is a claim nobody defined`,
      });
    }
    if (!ATTACK_CLASSES.includes(d.attack_class)) {
      problems.push({
        kind: "unknown_attack_class",
        obligation_id: d.obligation_id,
        attack_class: d.attack_class,
      });
    }
    // L4 at publication. A pass over a class no mutant ever proved detectable means only
    // "nothing happened" — which is also what a broken detector says.
    if (
      d.discharge_status === "attacked_pass" &&
      admissibility &&
      !admissibility.isAdmissible(d.attack_class)
    ) {
      problems.push({
        kind: "inadmissible_pass",
        obligation_id: d.obligation_id,
        function_id: d.function_id,
        attack_class: d.attack_class,
        reason:
          `no valid green->red->green receipt discharges ${d.attack_class}, so a pass over it is ` +
          `indistinguishable from a detector that cannot fail (L4)`,
      });
    }
    if (!seen.has(d.function_id)) {
      problems.push({
        kind: "discharge_outside_closure",
        obligation_id: d.obligation_id,
        function_id: d.function_id,
        reason: "a discharge names a member the committed universe does not contain (L2)",
      });
    }
  }

  const cellsByMember = new Map();
  for (const cell of cells) {
    if (!cellsByMember.has(cell.function_id)) cellsByMember.set(cell.function_id, []);
    cellsByMember.get(cell.function_id).push(cell);
  }

  const rows = [];
  const unstatused = [];
  const tally = Object.fromEntries(COVERAGE_STATUSES.map((s) => [s, 0]));
  for (const m of members) {
    const memberCells = cellsByMember.get(m.function_id) ?? [];
    if (memberCells.length === 0) {
      problems.push({
        kind: "member_without_cells",
        function_id: m.function_id,
        reason:
          "every committed member is crossed with all sixteen classes. A member with no cells " +
          "was never considered, and the ledger will not derive a status from nothing",
      });
    }
    const derived = deriveMemberStatus({
      cells: memberCells,
      discharges: byObligation,
      delegatesTo: delegation.get?.(m.function_id) ?? null,
    });
    if (derived.status) tally[derived.status] += 1;
    else unstatused.push({ function_id: m.function_id, reason: derived.reason });
    rows.push({
      function_id: m.function_id,
      cells_total: memberCells.length,
      cells_obligated: memberCells.filter((c) => c.applicability === "obligated").length,
      cells_discharged: memberCells.filter((c) => byObligation.has(c.obligation_id)).length,
      coverage_status: derived.status,
      derivation_reason: derived.reason,
      blocking_obligation_ids: derived.blocking,
    });
  }

  const obligatedTotal = cells.filter((c) => c.applicability === "obligated").length;
  const obligatedDischarged = cells.filter(
    (c) => c.applicability === "obligated" && byObligation.has(c.obligation_id)
  ).length;

  // Discharges that landed on a cell the matrix marks OMITTED. Not a problem — attacking beyond
  // the obligation is welcome — but counted separately and never toward coverage. Summed in, they
  // would inflate the numerator with work the denominator never asked for, which is the arithmetic
  // form of moving the goalposts. A non-zero count also says something worth reading: the class
  // somebody chose to attack is one the role matrix did not require, so either the attack or the
  // role assignment is aimed at the wrong thing.
  const dischargedOnOmitted = cells.filter(
    (c) => c.applicability === "omitted" && byObligation.has(c.obligation_id)
  ).length;
  const dischargesOutsideMatrix = byObligation.size - obligatedDischarged - dischargedOnOmitted;

  // THE L1 GATE. Every member statused, every obligated cell discharged, no problem outstanding.
  // Three conditions, all required, and the reason is recorded when any fails — "not certified" on
  // its own tells a reader nothing they can act on.
  const l1Reasons = [];
  if (unstatused.length > 0) {
    l1Reasons.push(`${unstatused.length} of ${members.length} members derive no status`);
  }
  if (obligatedDischarged < obligatedTotal) {
    l1Reasons.push(
      `${obligatedTotal - obligatedDischarged} of ${obligatedTotal} obligated cells undischarged`
    );
  }
  if (problems.length > 0) l1Reasons.push(`${problems.length} ledger problem(s)`);

  // The Annex A2 overlay: exactly three fields, one row per committed member, no additions and no
  // omissions. Emitted even when L1 is not certified, because the overlay reports what IS known.
  const overlay = rows.map((r) => ({
    function_id: r.function_id,
    attack_pack_ids: [
      ...new Set(
        (cellsByMember.get(r.function_id) ?? [])
          .map((c) => byObligation.get(c.obligation_id)?.pack_id)
          .filter(Boolean)
      ),
    ].sort(),
    coverage_status: r.coverage_status,
  }));

  return {
    problems,
    rows,
    overlay,
    unstatused,
    tally,
    cells_total: cells.length,
    cells_obligated: obligatedTotal,
    cells_obligated_discharged: obligatedDischarged,
    cells_discharged_on_omitted: dischargedOnOmitted,
    discharges_outside_the_matrix: dischargesOutsideMatrix,
    cells_discharged: byObligation.size,
    l1_certified: l1Reasons.length === 0,
    l1_reasons: l1Reasons,
    coverage_discharge_root: digest(OVERLAY_DOMAIN, overlay),
    ledger_digest: digest(COVERAGE_DOMAIN, { rows, tally, l1_certified: l1Reasons.length === 0 }),
  };
}
