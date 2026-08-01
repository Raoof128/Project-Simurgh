// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 32 — the gate census, compared by VALUE.
//
// REVISION 1 CHECKED PRESENCE, AND SIX PRESENT-BUT-MEANINGLESS STRINGS PASSED IT (§13, B11). A gate
// declaring `active_phase: "yes"` and `sunset_or_migration_condition: "n/a"` satisfied every
// assertion, because the assertions asked whether a field existed rather than what it said.
//
// So each gate's complete lifecycle object is compared FIELD BY FIELD against a frozen authority,
// and drift is reported per field: which gate, which field, from what to what. This is the standing
// rule the repository wrote after F002/F004/F005 — every stage gate declares its successor
// behaviour BEFORE freeze — turned into something a machine reads.

export const LIFECYCLE_FIELDS = Object.freeze([
  "active_phase",
  "protected_surface",
  "next_phase_behaviour",
  "maintenance_behaviour",
  "sunset_or_migration_condition",
  "anti_vacuity_condition",
]);

/**
 * The frozen authority. Every gate 5S installs, with what each lifecycle field must SAY — not that
 * it says something.
 */
export const GATE_LIFECYCLE_AUTHORITY = Object.freeze({
  "G-write-surface": Object.freeze({
    active_phase: "Stage 5S implementation, Task 2 until the 5S tag",
    protected_surface: "the rows of Annex S.2, plus Annex M's three exact paths",
    next_phase_behaviour:
      "inert for authorising writes; the checker remains runnable so a successor can re-verify what 5S was permitted to touch",
    maintenance_behaviour:
      "additive rows only, each carrying its own id and purpose; an existing row's operation set may never be widened",
    sunset_or_migration_condition:
      "when Stage 5S's tree is archived, at which point the prefixes match nothing and the anti-vacuity condition fails loudly rather than passing silently",
    anti_vacuity_condition:
      "the checker must have evaluated a NON-EMPTY change set, or the working tree is dirty and it refuses",
  }),
  "G-lean-proofs": Object.freeze({
    active_phase: "from Task 26 onward, repository-wide",
    protected_surface: "proofs/stage5s/Vwq.lean and the repo-wide floor of 39",
    next_phase_behaviour:
      "remains active for every later stage; the floor rises with each stage that adds a proof",
    maintenance_behaviour:
      "the floor may rise and may never fall in the same commit that deletes a proof; that decrease is caught by review",
    sunset_or_migration_condition: "never — the gate is repository-wide and outlives this stage",
    anti_vacuity_condition:
      "the gate poisons a scratch corpus every run and demands its own refusal, so the camera is re-proved rather than trusted",
  }),
  "G-claim-gate": Object.freeze({
    active_phase: "from Task 29 until the 5S tag, over Stage 5S-authored claim surfaces only",
    protected_surface:
      "signed claim and non-claim fields, the 5S README and closeout text, generated evidence summaries, release metadata, machine-readable scorecard text",
    next_phase_behaviour:
      "inert for later stages' prose; each stage scopes its own surfaces, and this one never widens to arbitrary repository text",
    maintenance_behaviour:
      "banned patterns are additive and each must ship a positive fixture that trips it and an honest phrasing that passes",
    sunset_or_migration_condition:
      "when the 5S claim surfaces are archived; the pattern list survives as prior art for the next stage's gate",
    anti_vacuity_condition: "an empty surface set is a refusal, never a pass",
  }),
  "G-ci-trigger": Object.freeze({
    active_phase: "from Task 31 until the 5S tag",
    protected_surface: "the paths: list of .github/workflows/stage-5s-checks.yml",
    next_phase_behaviour:
      "keeps firing on 5S-owned paths only; it must never widen to every pull request against main, which is the Q1-F005 defect it exists to avoid repeating",
    maintenance_behaviour:
      "paths are additive and must stay within 5S-owned trees plus shared libraries 5S actually changed",
    sunset_or_migration_condition:
      "when the 5S tree is archived and no owned path can change; the workflow is then removed rather than left firing on nothing",
    anti_vacuity_condition:
      "the self-test REFUSES a paths list that omits this workflow file, and refuses one that fires on an unrelated prior-stage path; a trigger repair that could not run its own job is a red test rather than a silent no-op",
  }),
  "G-attestation": Object.freeze({
    active_phase: "from Task 30 until the 5S tag",
    protected_surface:
      "the attestation envelope, its public key and fingerprint under evidence/stage-5s/attestation/",
    next_phase_behaviour:
      "the envelope stays verifiable forever from committed public inputs; later stages may bind its root and must not re-sign it",
    maintenance_behaviour:
      "a re-emission requires the same signer key and a recorded reason; the non-claim ID set may grow and may never shrink",
    sunset_or_migration_condition:
      "when the signer key is rotated, at which point the old envelope stays valid under the old committed key",
    anti_vacuity_condition:
      "the verifier refuses --key, and refuses an attestation whose quorum map is short by one",
  }),
  "G-lane-c-capture": Object.freeze({
    active_phase: "from Task 24, never CI-gated",
    protected_surface: "docs/research/llm-shield/evidence/stage-5s/lane-c/",
    next_phase_behaviour:
      "the frozen capture stays offline-verifiable; no later stage may re-run acquisition and overwrite it",
    maintenance_behaviour:
      "a new capture is added beside the old one, never in place of it; a failed acquisition is recorded as a typed outcome and never retried until it looks good",
    sunset_or_migration_condition:
      "when the anchored digest no longer corresponds to any committed checkpoint",
    anti_vacuity_condition:
      "an absent capture is not_captured and never green; an unverifiable capture is a refusal and never a skip",
  }),
});

export const GATE_IDS = Object.freeze(Object.keys(GATE_LIFECYCLE_AUTHORITY).sort());

export const CENSUS_REFUSALS = Object.freeze({
  GATE_ABSENT: "GATE_ABSENT_FROM_CENSUS",
  GATE_UNDECLARED: "GATE_NOT_IN_AUTHORITY",
  FIELD_ABSENT: "LIFECYCLE_FIELD_ABSENT",
  FIELD_DRIFT: "LIFECYCLE_FIELD_DRIFT",
  FIELD_MEANINGLESS: "LIFECYCLE_FIELD_MEANINGLESS",
});

/** Values that satisfy a presence check and say nothing. The six that passed revision 1. */
const MEANINGLESS = new Set(["", "yes", "no", "n/a", "N/A", "tbd", "TBD", "-", "none", "ok"]);

/**
 * Compare a census against the frozen authority, field by field. Pure; never throws.
 *
 * @returns {{ok: boolean, refusals: Array<object>, compared: number}}
 */
export function checkCensus(census) {
  const refusals = [];
  const declared = census && typeof census === "object" ? census : {};
  let compared = 0;

  for (const gate of GATE_IDS) {
    const actual = declared[gate];
    if (!actual || typeof actual !== "object") {
      refusals.push({ reason: CENSUS_REFUSALS.GATE_ABSENT, gate });
      continue;
    }
    for (const field of LIFECYCLE_FIELDS) {
      const expected = GATE_LIFECYCLE_AUTHORITY[gate][field];
      const value = actual[field];
      if (value === undefined || value === null) {
        refusals.push({ reason: CENSUS_REFUSALS.FIELD_ABSENT, gate, field });
        continue;
      }
      // The revision-1 defect, refused explicitly: a value that is present and says nothing.
      if (typeof value !== "string" || MEANINGLESS.has(value.trim()) || value.trim().length < 20) {
        refusals.push({
          reason: CENSUS_REFUSALS.FIELD_MEANINGLESS,
          gate,
          field,
          detail: JSON.stringify(value),
        });
        continue;
      }
      if (value !== expected) {
        refusals.push({
          reason: CENSUS_REFUSALS.FIELD_DRIFT,
          gate,
          field,
          detail: `declared ${JSON.stringify(value.slice(0, 60))}, authority says ${JSON.stringify(expected.slice(0, 60))}`,
        });
        continue;
      }
      compared += 1;
    }
  }

  for (const gate of Object.keys(declared)) {
    if (!GATE_IDS.includes(gate)) {
      refusals.push({ reason: CENSUS_REFUSALS.GATE_UNDECLARED, gate });
    }
  }

  // Anti-vacuity: a census that compared no field is a census of nothing.
  if (compared === 0) {
    refusals.push({ reason: CENSUS_REFUSALS.GATE_ABSENT, detail: "no field was compared" });
  }
  return { ok: refusals.length === 0, refusals, compared };
}
