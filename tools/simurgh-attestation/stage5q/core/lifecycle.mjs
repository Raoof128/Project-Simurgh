// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the lifecycle state machine, as DATA (finding 5Q-F013).
//
// A deadlock asserted in prose is an argument. A deadlock computed over the declared phase table is
// a finding, and this stage does not publish the first kind.
//
// The phases are exhaustive — spec §6.1.1 lists three Q0 phases and §6.2 adds Q1, and there is no
// fourth. Each phase declares what it MAY produce. The entry conditions for Q1 declare what must be
// true before it begins. `phaseDeadlock` crosses the two: for every unsatisfied entry condition, it
// asks which phase is permitted to produce the artifact that would satisfy it, and reports the
// conditions for which the answer is NONE.
//
// The answer being non-empty is the finding. The answer being computed rather than asserted is what
// makes it citable.

/** Spec §6.1.1 plus §6.2. Exhaustive: there is no fourth phase. */
export const PHASES = Object.freeze(
  [
    {
      id: "Q0_PREPARATION",
      tasks: "1-8",
      may_produce: ["census", "closure", "obligation_matrix"],
      note: "the closure does not exist yet; nothing is bound by L2",
    },
    {
      id: "Q0_DISCOVERY",
      tasks: "9-20",
      may_produce: ["attack_results", "coverage_evidence", "findings", "attestation"],
      note: "attacks run against the committed closure; ends with the signed freeze",
      ends_with: "Q0 evidence becomes read-only",
    },
    {
      id: "Q0_TRANSITION",
      tasks: "21",
      // The empty list is the load-bearing part. The plan says "validation only. No new evidence is
      // produced." A phase that may produce nothing cannot satisfy a condition that needs evidence.
      may_produce: [],
      note: "validation only; produces no evidence",
    },
    {
      id: "Q1",
      tasks: "remediation",
      may_produce: ["repairs", "regression_fixtures", "q1_records", "harness_repairs"],
      note: "only after the Q0 freeze may fixes land",
      entry_gated_by: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
    },
  ].map(Object.freeze)
);

/**
 * What each transition condition would NEED in order to become true.
 *
 * Stated per condition rather than in general, because the deadlock is not uniform: T2 accommodates
 * incompleteness by design and transitions fine, while T3 demands totality. Collapsing them into
 * "the gate is too strict" would lose exactly the distinction the finding is about.
 */
export const CONDITION_REQUIREMENTS = Object.freeze({
  T1: { needs: "attestation", note: "produced in Q0_DISCOVERY" },
  T2: { needs: null, note: "satisfiable by RECORDING inadmissibility; needs no new artifact" },
  T3: { needs: "coverage_evidence", note: "every member statused requires more attack results" },
  T4: { needs: null, note: "a property of the ledger already produced" },
  T5: { needs: null, note: "satisfied by the absence of Q1 records" },
  T6: { needs: null, note: "a property of the spec, not an artifact to produce" },
  T7: { needs: "harness_repairs", note: "the failing commands are outside 5Q's write surface" },
});

/**
 * Compute the deadlock.
 *
 * @param {object} input
 * @param {string[]} input.unsatisfied  condition ids currently false
 * @param {string}   input.currentPhase the phase the stage is in
 * @returns {{deadlocked: boolean, blocked: object[], escapes: object[]}}
 */
export function phaseDeadlock({ unsatisfied, currentPhase }) {
  const current = PHASES.findIndex((p) => p.id === currentPhase);
  if (current === -1) throw new Error(`unknown phase ${currentPhase}`);

  // Only phases at or after the current one are reachable. A finished phase cannot be re-entered:
  // Q0_DISCOVERY ended when the freeze was signed, and re-opening it would rewrite frozen evidence,
  // which is the L2/L3 violation the freeze exists to prevent.
  const reachable = PHASES.slice(current).filter((p) => p.id !== "Q1");

  const blocked = [];
  const escapes = [];
  for (const id of unsatisfied) {
    const requirement = CONDITION_REQUIREMENTS[id];
    if (!requirement) throw new Error(`unknown condition ${id}`);
    if (requirement.needs === null) {
      escapes.push({ condition: id, resolution: "satisfiable without producing an artifact" });
      continue;
    }
    const producer = reachable.find((p) => p.may_produce.includes(requirement.needs));
    if (producer) {
      escapes.push({
        condition: id,
        resolution: `${producer.id} may produce ${requirement.needs}`,
      });
    } else {
      blocked.push({
        condition: id,
        needs: requirement.needs,
        reason:
          `no phase at or after ${currentPhase} may produce '${requirement.needs}'. ` +
          `Q1 could, but Q1 is gated on ${id} being true.`,
      });
    }
  }
  return {
    deadlocked: blocked.length > 0,
    blocked,
    escapes,
    reachable_phases: reachable.map((p) => p.id),
  };
}
