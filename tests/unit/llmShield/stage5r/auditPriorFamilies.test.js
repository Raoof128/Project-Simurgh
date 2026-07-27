// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 21: the audit 5R owes its predecessor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  auditFamily,
  verdictFor,
  assertConditionOrder,
  CONDITION_STATES,
} from "../../../../tools/simurgh-attestation/stage5r/core/priorAudit.mjs";
import {
  buildAudit,
  EXPECTED_FAMILIES,
  AUDIT_PATH,
} from "../../../../tools/simurgh-attestation/stage5r/node/auditPriorFamilies.mjs";
import { SEVEN_CONDITIONS } from "../../../../tools/simurgh-attestation/stage5r/core/admissibility.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const audit = JSON.parse(buildAudit(ROOT));

test("all six §7.3 families are audited, in §7.3's order", () => {
  assert.deepEqual(
    audit.families.map((f) => f.audited_family_id),
    [...EXPECTED_FAMILIES]
  );
  assert.equal(audit.family_count, 6);
});

test("every family is judged against all seven conditions, in §4.1's order", () => {
  for (const f of audit.families) {
    assert.deepEqual(
      f.conditions.map((c) => c.id),
      [...SEVEN_CONDITIONS],
      f.audited_family_id
    );
    for (const c of f.conditions) assert.ok(CONDITION_STATES.includes(c.state), c.state);
  }
});

test("THE TRIAD IS ABSENT, which is the whole finding", () => {
  for (const f of audit.families) {
    const byId = Object.fromEntries(f.conditions.map((c) => [c.id, c]));
    assert.equal(byId.vulnerable_control_detected.state, "absent", f.audited_family_id);
    assert.equal(byId.safe_control_not_detected.state, "absent", f.audited_family_id);
    assert.equal(byId.orthogonal_failure_not_misclassified.state, "absent", f.audited_family_id);
    assert.equal(f.admissible_under_5r, false);
  }
  assert.equal(audit.inadmissible_under_5r, 6);
});

test("the conditions that DO hold are derived from the signed data, not assumed", () => {
  // Premise recomputation and closure binding are properties of 5Q's own records. Scoring them as
  // failures would be as dishonest as scoring the triad as present.
  for (const f of audit.families) {
    const byId = Object.fromEntries(f.conditions.map((c) => [c.id, c]));
    assert.equal(byId.premises_recomputed.state, "holds", f.audited_family_id);
    assert.equal(byId.results_bind_to_inherited_closure.state, "holds", f.audited_family_id);
    assert.match(byId.premises_recomputed.detail, /^\d+ of \d+ discharges/);
    assert.ok(f.discharges_examined > 0, f.audited_family_id);
  }
});

test("a family's discharges spanning many roles is MEASURED, not narrated", () => {
  // §1.2's defect in one number: a family declares a category, and its discharges land in whatever
  // roles those members happened to have.
  const multi = audit.families.filter((f) => f.roles_spanned.length > 1);
  assert.ok(multi.length > 0, "no family spanned more than one role — recheck the derivation");
  for (const f of audit.families) {
    const c = f.conditions.find((x) => x.id === "target_role_matches_claimed_applicability");
    assert.equal(c.state, "not_evaluable");
    assert.deepEqual(c.roles_spanned, f.roles_spanned);
  }
});

test("EVERY record says it judges a historical artefact against a later contract", () => {
  for (const f of audit.families) {
    assert.equal(f.judges_a_historical_artefact_against_a_later_contract, true);
    assert.match(f.admitted_under, /5Q Law 4/);
    assert.match(f.nothing_is_removed, /does not withdraw one/);
    assert.match(f.question, /Does this signed 5Q family artefact/);
  }
  assert.match(audit.nothing_is_withdrawn, /1 438 discharged cells stand/);
  assert.match(audit.note, /NO SCORE MOVES/);
  assert.match(audit.revalidation_is_out_of_scope, /deferred/);
});

test("verdictFor admits on `holds` alone", () => {
  assert.equal(verdictFor([{ id: "a", state: "holds" }]).admissible_under_5r, true);
  for (const state of ["absent", "not_evaluable"]) {
    const r = verdictFor([
      { id: "a", state: "holds" },
      { id: "b", state },
    ]);
    assert.equal(r.admissible_under_5r, false);
    assert.deepEqual(r.failing_conditions, ["b"]);
  }
});

test("a reordered condition list is REFUSED rather than silently renamed", () => {
  // §4.1's order is what names the results. Reordering it would keep every verdict and relabel it.
  assertConditionOrder([...SEVEN_CONDITIONS]);
  const swapped = [...SEVEN_CONDITIONS];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  assert.throws(() => assertConditionOrder(swapped), /not §4.1's seven, in §4.1's order/);
  assert.throws(() => assertConditionOrder(SEVEN_CONDITIONS.slice(0, 6)), /§4.1's seven/);
});

test("a family with no discharges cannot report its premises as recomputed", () => {
  // 0 of 0 is not 100%: an empty family would otherwise pass two conditions by vacuity.
  const empty = auditFamily({
    family: {
      family_id: "x",
      attack_class: "R1",
      categories: ["exported_function"],
      pack_id: "p",
      intent: "i",
    },
    discharges: [],
    roleOf: new Map(),
    closureIds: new Set(),
    artefactHasRestorationReceipt: false,
  });
  const byId = Object.fromEntries(empty.conditions.map((c) => [c.id, c]));
  assert.equal(byId.premises_recomputed.state, "not_evaluable");
  assert.equal(byId.results_bind_to_inherited_closure.state, "not_evaluable");
  assert.equal(empty.admissible_under_5r, false);
});

test("the audit is deterministic, and matches its committed copy", () => {
  assert.equal(buildAudit(ROOT), buildAudit(ROOT));
  const committed = join(ROOT, AUDIT_PATH);
  if (existsSync(committed)) {
    assert.equal(readFileSync(committed, "utf8"), buildAudit(ROOT));
  }
});
