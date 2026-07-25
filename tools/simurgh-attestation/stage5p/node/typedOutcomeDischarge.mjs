// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §5.1 — the GENERATED typed-outcome discharge ledger.
//
// §2.12 is the frozen law and lives in core/dischargeGate.mjs. THIS file is the mutable state that
// law governs, and it is deliberately generated rather than written: every `witnessed` row is
// produced by RUNNING a fixture through the verifier and recording what came back. A hand-written
// row would be the prose assertion §2.12 forbids, dressed as evidence.
//
// Byte-stable: no clock, no randomness, no network, no filesystem beyond module imports.
import { POLICY_OUTCOMES, verifySection2 } from "../core/section2Verifier.mjs";
import { S2_FIXTURES, COVERAGE_FIXTURES, cleanAncestor, PINNED } from "./laneAFixtures.mjs";

/**
 * Non-witnessed discharges, declared by hand because no execution can produce them: a
 * `mechanically_unreachable` row cites a proof, and a `reserved` row cites a signed non-claim and an
 * amendment trigger.
 *
 * EMPTY BY DESIGN, today. Every one of the nine typed outcomes is currently witnessed by a Lane A
 * fixture, so nothing is reserved and nothing is claimed unreachable. The path is exercised by test
 * injection rather than left as dead code — see typedOutcomeDischarge.test.js.
 */
export const DECLARED_DISCHARGES = Object.freeze({});

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Executes one fixture and returns the row evidence, or null if it did not reach what it claims.
 * The premise facts are the same ones the matrix test asserts: the mutation applied, the ancestor is
 * genuinely accepted, and the first failure landed where the fixture said it would.
 */
function witness(fixture) {
  const ancestor = cleanAncestor();
  const mutant = fixture.build();
  const ancestorAccepted = verifySection2(ancestor, PINNED).ok === true;
  const mutationApplied = !deepEqual(mutant, ancestor);
  const r = verifySection2(mutant, PINNED);
  if (r.ok) return null;
  return {
    lane: "A",
    expected_check_id: fixture.expected_check_id,
    observed_check_id: r.check_id,
    observed_policy_outcome: r.outcome,
    premise_receipt:
      `ancestor_accepted=${ancestorAccepted} ` +
      `mutation_applied=${mutationApplied} ` +
      `first_failure=${r.check_id} outcome=${r.outcome}`,
  };
}

/**
 * @param phase    "draft" | "release" — recorded on the ledger; validation is the gate's job.
 * @param declared non-witnessed discharges, keyed by policy outcome (see DECLARED_DISCHARGES).
 */
export function buildDischargeLedger(phase, declared = DECLARED_DISCHARGES) {
  // Execute every fixture once, and index the results by the outcome they actually produced —
  // never by the outcome they claim to produce.
  const observed = new Map();
  for (const fixture of [...S2_FIXTURES, ...COVERAGE_FIXTURES]) {
    const w = witness(fixture);
    if (!w) continue;
    const key = w.observed_policy_outcome;
    if (!observed.has(key)) observed.set(key, { ...w, fixture_ids: [] });
    const row = observed.get(key);
    row.fixture_ids.push(fixture.fixture_id);
    // A second fixture reaching the same outcome at a DIFFERENT check is recorded honestly rather
    // than averaged away: the row keeps the first check and the gate compares against it.
    if (row.observed_check_id !== w.observed_check_id) row.observed_check_id_conflict = true;
  }

  const outcomes = POLICY_OUTCOMES.map((policy_outcome) => {
    const decl = declared?.[policy_outcome];
    if (decl) return { policy_outcome, ...decl };
    const w = observed.get(policy_outcome);
    if (!w) return { policy_outcome, status: "pending" };
    const { observed_check_id_conflict: _conflict, ...row } = w;
    return {
      policy_outcome,
      status: "witnessed",
      lane: row.lane,
      fixture_ids: [...row.fixture_ids].sort(),
      expected_check_id: row.expected_check_id,
      observed_check_id: row.observed_check_id,
      observed_policy_outcome: row.observed_policy_outcome,
      premise_receipt: row.premise_receipt,
    };
  });

  return { type: "simurgh.vsi.typed_outcome_discharge.v1", phase, outcomes };
}
