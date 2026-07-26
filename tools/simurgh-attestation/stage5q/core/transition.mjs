// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the frozen Q0→Q1 transition contract (Task 21).
//
// SEVEN CONDITIONS. Q1 may not begin until all of them hold, and each fails independently so the
// answer is "T4 broke" rather than "something broke".
//
//   T1  the Q0 attestation verifies and its TEN roots recompute
//   T2  every attack class is admissible, or its inadmissibility is RECORDED in the attestation
//   T3  every closure member has exactly one coverage status
//   T4  the finding ledger chain verifies end to end
//   T5  no Q1 record exists yet for any finding
//   T6  the frozen-block digest still equals da78774b… (the spec was not edited in place)
//   T7  prior-stage non-disturbance: the pinned manifest runs green
//
// TRANSITION IS NOT RELEASE (gauntlet P1-38), and the distinction is the point of T2.
//
//     Q0 MAY freeze an incomplete or partly inadmissible result. Freezing what actually happened
//            is the whole point of Q0.
//     Q1 MAY be authorised to repair the HARNESS as well as the code.
//     STAGE 5Q RELEASE remains BLOCKED until every required class is admissible.
//
// An honest frozen record of an incomplete campaign is worth more than a delayed one pretending to
// be complete — but it does not ship as a finished stage, and this module says which of the two it
// is looking at rather than collapsing them into one verdict.

export const TRANSITION_CONDITIONS = Object.freeze(["T1", "T2", "T3", "T4", "T5", "T6", "T7"]);

export const FROZEN_BLOCK_DIGEST =
  "da78774b77495459e4889e1c433e1933bb502ac81c9e5c0811e2450af7fdfc74";

/**
 * The pinned non-disturbance manifest.
 *
 * The eight scripts here are the Stage-5 reproduce scripts NOT covered by `check-e2e.sh`. The
 * manifest is PINNED rather than assumed: a test diffs it against the real
 * `scripts/reproduce-llm-shield-stage5*.sh` listing, so a future stage's script cannot end up
 * silently outside the non-disturbance check.
 */
export const UNCOVERED_STAGES = Object.freeze(["5f", "5g", "5i", "5j", "5k", "5l", "5n", "5p"]);

/**
 * Stages whose reproduce script is gated by its OWN workflow rather than by `check-e2e.sh`.
 *
 * 5O has `stage-5o-reproduce.yml`. Accounted for is not the same as covered-by-check-e2e, and
 * folding it into either of the other two lists would misdescribe which gate actually runs it —
 * so it gets its own name. Leaving it out entirely was the first version, and the coverage check
 * correctly reported it as a gap.
 */
export const COVERED_BY_OWN_WORKFLOW = Object.freeze(["5o"]);

const cond = (id, ok, detail) => ({ id, ok, detail });

/**
 * Evaluate the seven conditions.
 *
 * Every input is passed IN. Nothing here reads the disk, so the whole contract is testable against
 * a violation of each condition in turn — and a condition that can only be exercised by breaking
 * the real repository is a condition nobody exercises.
 */
export function evaluateTransition({
  attestation,
  coverage,
  ledger,
  frozenBlockDigest,
  manifestResults,
}) {
  const conditions = [];

  // T1 — the attestation verifies AND its roots recompute. Both halves: a verifying signature over
  // roots nobody recomputed is the exact failure the attestation's own ordering exists to prevent.
  conditions.push(
    cond(
      "T1",
      attestation?.verified === true && attestation?.roots_recomputed === true,
      attestation?.verified !== true
        ? "the Q0 attestation does not verify"
        : attestation?.roots_recomputed !== true
          ? "the attestation verifies but its roots were not recomputed from the evidence"
          : `attestation verifies over ${attestation.root_count} recomputed roots`
    )
  );

  // T2 — inadmissibility is permitted, CONCEALMENT is not.
  const inadmissible = attestation?.inadmissible_classes ?? null;
  const recorded = Array.isArray(inadmissible);
  conditions.push(
    cond(
      "T2",
      recorded,
      !recorded
        ? "inadmissible_classes is absent; an unrecorded inadmissible class is a concealed one"
        : inadmissible.length === 0
          ? "every attack class is admissible"
          : `${inadmissible.length} class(es) inadmissible and RECORDED: ${inadmissible.join(", ")} — ` +
            "Q0 may freeze this; STAGE RELEASE stays blocked until they are admissible"
    )
  );

  // T3 — exactly one status per member. "Exactly one" fails in two directions and both are named.
  const members = coverage?.member_count ?? 0;
  const statused = coverage?.statused ?? 0;
  const duplicated = coverage?.duplicated ?? 0;
  conditions.push(
    cond(
      "T3",
      members > 0 && statused === members && duplicated === 0,
      duplicated > 0
        ? `${duplicated} member(s) carry more than one status`
        : statused === members
          ? `all ${members} members carry exactly one status`
          : `${members - statused} of ${members} members carry NO status — uncovered, not covered`
    )
  );

  // T4 — the chain, recomputed.
  conditions.push(
    cond(
      "T4",
      ledger?.chain_ok === true,
      ledger?.chain_ok === true
        ? `chain verified over ${ledger.record_count} record(s)`
        : `the chain breaks at record ${ledger?.broken_at ?? "?"}`
    )
  );

  // T5 — Q1 has not started. A Q1 record before the freeze means the ledger was appended to while
  // the thing it was being frozen against was still moving.
  const q1 = ledger?.q1_record_count ?? 0;
  conditions.push(
    cond(
      "T5",
      q1 === 0,
      q1 === 0 ? "no Q1 record exists yet" : `${q1} Q1 record(s) already present`
    )
  );

  // T6 — the spec was not edited in place. §§2-5 are frozen and amendments are annex-only.
  conditions.push(
    cond(
      "T6",
      frozenBlockDigest === FROZEN_BLOCK_DIGEST,
      frozenBlockDigest === FROZEN_BLOCK_DIGEST
        ? "the frozen block is unchanged"
        : `the frozen block moved to ${frozenBlockDigest}`
    )
  );

  // T7 — the manifest RAN and every command in it passed. A manifest that did not run has not
  // passed; the earlier version of this gate printed the failure and exited zero anyway.
  const ran = Array.isArray(manifestResults) && manifestResults.length > 0;
  const failed = ran ? manifestResults.filter((r) => r.ok !== true) : [];
  conditions.push(
    cond(
      "T7",
      ran && failed.length === 0,
      !ran
        ? "the non-disturbance manifest did not run — that is not a pass"
        : failed.length === 0
          ? `${manifestResults.length} manifest command(s) green`
          : `${failed.length} regressed: ${failed.map((f) => f.command).join(", ")}`
    )
  );

  const authorised = conditions.every((c) => c.ok);
  return {
    conditions,
    q1_authorised: authorised,
    // Deliberately separate from `q1_authorised`. Transition is not release.
    stage_release_blocked: (inadmissible?.length ?? 1) > 0,
    release_blocked_reason:
      (inadmissible?.length ?? 1) > 0
        ? `attack class(es) ${(inadmissible ?? ["<unrecorded>"]).join(", ")} have no green->red->green ` +
          "receipt, so §12.1's release gates are not met even though Q0 may freeze this honestly"
        : null,
  };
}

/**
 * The manifest must cover every Stage-5 reproduce script.
 *
 * Returns the scripts that are in neither `check-e2e.sh` nor the pinned uncovered list. A future
 * stage's script landing outside both is exactly how a non-disturbance check quietly stops
 * covering a stage.
 */
export function manifestGaps({ allStageScripts, coveredByCheckE2e }) {
  const accountedFor = new Set([
    ...coveredByCheckE2e,
    ...UNCOVERED_STAGES.map((s) => `scripts/reproduce-llm-shield-stage${s}.sh`),
    ...COVERED_BY_OWN_WORKFLOW.map((s) => `scripts/reproduce-llm-shield-stage${s}.sh`),
  ]);
  return allStageScripts.filter((s) => !accountedFor.has(s)).sort();
}
