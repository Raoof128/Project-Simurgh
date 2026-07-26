// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 14 — the shared stage-tray contract.
//
// One engine, sixteen trays. These tests are the contract every tray inherits, so a defect here is
// a defect in all sixteen and is fixed once.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTray,
  selectTargets,
  validateSummary,
  classifyPositivePath,
  CLEAN_TRAY_SUMMARY,
  UNRUN_TRAY_SUMMARY,
  FORBIDDEN_SUMMARY_TOKENS,
  POSITIVE_PATH_RESULTS,
  FULL_OBLIGATION_ROLES,
  TRAY_FIELDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/tray.mjs";
import { admissibility } from "../../../../tools/simurgh-attestation/stage5q/core/harness.mjs";
import {
  MUTANT_IDS,
  MUTANT_PRIMARY_CLASS,
  ATTACK_CLASSES,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const CLOSURE = "c".repeat(64);

const receipt = (mutant_id) => ({
  mutant_id,
  baseline_command: "x",
  baseline_exit: 0,
  mutation_applied: true,
  mutation_digest: "d".repeat(64),
  mutated_command: "x",
  mutated_exit: 1,
  detecting_pack_id: `5q-sp-${MUTANT_PRIMARY_CLASS[mutant_id].toLowerCase()}-01`,
  mutation_reverted: true,
  restored_command: "x",
  restored_exit: 0,
});
const allDischarged = admissibility(MUTANT_IDS.map(receipt));

const row = (over = {}) => ({
  function_id: "5a:x.mjs:verify",
  attack_class: "R1",
  applicability: "obligated",
  pack_id: "5q-5a-r1-01",
  premise_receipt_digest: "p".repeat(64),
  observed_outcome: "rejected_unknown_key",
  discharge_status: "attacked_pass",
  finding_ids: [],
  ...over,
});

/** Rows covering every class: R1 obligated, the rest omitted with a frozen reason. */
const fullRows = (over = {}) => [
  row(over),
  ...ATTACK_CLASSES.filter((c) => c !== "R1").map((attack_class) => ({
    attack_class,
    applicability: "omitted",
    omission_reason: "no_such_input_surface",
    function_id: "5a:x.mjs:verify",
    discharge_status: null,
    finding_ids: [],
  })),
];

const build = (over = {}) =>
  buildTray({
    stageId: "5a",
    closureDigest: CLOSURE,
    committedClosureDigest: CLOSURE,
    targets: ["5a:x.mjs:verify"],
    obligationRows: fullRows(),
    packIds: ["5q-5a-r1-01"],
    findingIds: [],
    positivePath: { result: "reproduced", exit: 0 },
    admissibility: allDischarged,
    closureMemberIds: new Set(["5a:x.mjs:verify"]),
    ...over,
  });

// ---------------------------------------------------------------------------------------------
// Target selection is a RULE, not a list
// ---------------------------------------------------------------------------------------------

test("targets are exactly the four full-obligation roles, sorted, for this stage", () => {
  // A hand-picked list is a universe chosen after seeing what can be attacked. The rule means a
  // tray cannot quietly shrink its own denominator.
  const members = [
    { function_id: "5a:z.mjs:sign", stage_id: "5a" },
    { function_id: "5a:a.mjs:census", stage_id: "5a" },
    { function_id: "5a:b.mjs:helper", stage_id: "5a" },
    { function_id: "5b:c.mjs:other", stage_id: "5b" },
  ];
  const roles = {
    "5a:z.mjs:sign": "trust_decision",
    "5a:a.mjs:census": "completeness_claim",
    "5a:b.mjs:helper": "evidence_emission",
    "5b:c.mjs:other": "trust_decision",
  };
  assert.deepEqual(selectTargets({ members, roles, stageId: "5a" }), [
    "5a:a.mjs:census",
    "5a:z.mjs:sign",
  ]);
});

test("the four full-obligation roles are exactly the spec §2.4 four", () => {
  assert.deepEqual(
    [...FULL_OBLIGATION_ROLES],
    ["trust_decision", "completeness_claim", "canonicalisation", "code_allocation"]
  );
});

test("selection is deterministic — same input, same order, twice", () => {
  const members = [
    { function_id: "5a:b.mjs:f", stage_id: "5a" },
    { function_id: "5a:a.mjs:g", stage_id: "5a" },
  ];
  const roles = { "5a:b.mjs:f": "canonicalisation", "5a:a.mjs:g": "code_allocation" };
  const once = selectTargets({ members, roles, stageId: "5a" });
  assert.deepEqual(once, selectTargets({ members, roles, stageId: "5a" }));
  assert.deepEqual(once, [...once].sort());
});

// ---------------------------------------------------------------------------------------------
// L2 — the tray refuses a universe nobody committed
// ---------------------------------------------------------------------------------------------

test("a tray whose closure_digest is not the commitment REFUSES to run", () => {
  const r = build({ closureDigest: "b".repeat(64) });
  assert.equal(r.refused, true);
  assert.equal(r.refusal_reason, "closure_digest_mismatch");
  assert.match(r.detail, /universe nobody committed/);
});

test("a tray cannot INVENT a target outside the committed closure", () => {
  const r = build({ targets: ["5a:x.mjs:verify", "5a:ghost.mjs:phantom"] });
  const p = r.problems.find((x) => x.kind === "target_outside_closure");
  assert.ok(p);
  assert.equal(p.function_id, "5a:ghost.mjs:phantom");
});

// ---------------------------------------------------------------------------------------------
// L4 — no attacked_pass without a mutation receipt
// ---------------------------------------------------------------------------------------------

test("attacked_pass for a class with NO Task 12 receipt is a problem", () => {
  // The tray may still record what it observed; it may not call it a pass.
  const r = build({ admissibility: admissibility([]) });
  const p = r.problems.find((x) => x.kind === "attacked_pass_without_mutation_receipt");
  assert.ok(p);
  assert.equal(p.attack_class, "R1");
  assert.match(p.reason, /nothing happened|broken detector/);
});

test("attacked_pass is fine once the class IS discharged", () => {
  assert.deepEqual(build().problems, []);
  assert.equal(build().ok, true);
});

test("an unknown discharge status is refused", () => {
  const r = build({ obligationRows: fullRows({ discharge_status: "probably_fine" }) });
  assert.ok(r.problems.some((p) => p.kind === "unknown_discharge_status"));
});

// ---------------------------------------------------------------------------------------------
// Omissions carry a frozen reason
// ---------------------------------------------------------------------------------------------

test("EVERY omitted class carries a reason from the frozen six", () => {
  const r = build();
  assert.equal(r.record.omitted_classes_with_frozen_reason.length, 15);
  for (const o of r.record.omitted_classes_with_frozen_reason) {
    assert.equal(o.omission_reason, "no_such_input_surface");
  }
});

test("an omission with FREE TEXT is a problem", () => {
  const rows = fullRows().map((x) =>
    x.attack_class === "R7" ? { ...x, omission_reason: "not relevant here" } : x
  );
  const r = build({ obligationRows: rows });
  const p = r.problems.find((x) => x.kind === "omission_without_frozen_reason");
  assert.ok(p);
  assert.equal(p.attack_class, "R7");
  assert.match(p.reason, /free text is not a reason/i);
});

// ---------------------------------------------------------------------------------------------
// Per-obligation ROWS, not parallel arrays (gauntlet P2-8)
// ---------------------------------------------------------------------------------------------

test("obligation receipts are ROWS carrying all seven fields together", () => {
  // Parallel arrays drift silently: one gets an entry appended, another does not, and nothing in
  // the data can tell you. A row cannot drift against itself.
  const r = build();
  const first = r.record.obligation_receipts[0];
  assert.deepEqual(Object.keys(first).sort(), [
    "attack_class",
    "discharge_status",
    "finding_ids",
    "function_id",
    "observed_outcome",
    "pack_id",
    "premise_receipt_digest",
  ]);
  assert.equal(r.record.obligation_receipts.length, 16, "one row per class for the target");
});

test("the tray emits exactly the frozen field set", () => {
  assert.deepEqual(Object.keys(build().record).sort(), [...TRAY_FIELDS].sort());
});

// ---------------------------------------------------------------------------------------------
// positive_path_result — five frozen values, and a failed run is NOT a diff
// ---------------------------------------------------------------------------------------------

test("reproduction_failed is SEPARATE from reproduced_with_diff (gauntlet P1-23)", () => {
  // "Produced different bytes" and "did not run" are different facts, and merging them hides the
  // worse one: a stage whose reproduce script no longer executes would be filed as formatting.
  assert.equal(classifyPositivePath({ scriptExists: true, exit: 1 }), "reproduction_failed");
  assert.equal(
    classifyPositivePath({ scriptExists: true, exit: 0, diff: true }),
    "reproduced_with_diff"
  );
  assert.equal(classifyPositivePath({ scriptExists: true, exit: 0 }), "reproduced");
});

test("an absent script and an unusable environment are their own values", () => {
  assert.equal(classifyPositivePath({ scriptExists: false }), "script_absent");
  assert.equal(
    classifyPositivePath({ scriptExists: true, exit: 0, environmentUsable: false }),
    "environment_unreproducible"
  );
  assert.equal(POSITIVE_PATH_RESULTS.length, 5);
});

test("an unrecognised positive-path result is a problem", () => {
  const r = build({ positivePath: { result: "probably_ok" } });
  assert.ok(r.problems.some((p) => p.kind === "unknown_positive_path_result"));
});

// ---------------------------------------------------------------------------------------------
// THE FROZEN CLEAN-TRAY WORDING
// ---------------------------------------------------------------------------------------------

test("a clean tray emits the EXACT frozen sentence", () => {
  assert.equal(build().record.summary, CLEAN_TRAY_SUMMARY);
  assert.equal(
    CLEAN_TRAY_SUMMARY,
    "No finding was produced by these admissible packs over this frozen target set."
  );
});

test("a tray may NEVER say secure, no vulnerabilities, passed, safe or clean bill", () => {
  // Each of those claims something about the world. A tray knows only what it ran.
  for (const token of FORBIDDEN_SUMMARY_TOKENS) {
    const v = validateSummary(`This tray is ${token}.`);
    assert.equal(v.ok, false, token);
    assert.equal(v.problems[0].kind, "forbidden_summary_token");
    assert.match(v.problems[0].reason, /claims something about the world/);
  }
});

test("the frozen sentence itself passes the summary check", () => {
  assert.deepEqual(validateSummary(CLEAN_TRAY_SUMMARY).problems, []);
});

test("the check validates the SUMMARY FIELD, not every byte of the report (P2-7)", () => {
  // A raw tray record legitimately contains file paths and quoted historical text carrying these
  // words. A whole-file grep would either fire falsely on every run or be quietly relaxed until it
  // fired never — and a gate relaxed until it never fires is the disease this stage is about.
  const r = build({
    obligationRows: fullRows({ observed_outcome: "passed_through_to_the_safe_default" }),
  });
  assert.equal(validateSummary(r.record.summary).ok, true, "the summary is clean...");
  assert.match(
    JSON.stringify(r.record),
    /passed/,
    "...while the record legitimately contains the word elsewhere"
  );
});

test("a tray WITH findings does not use the clean sentence", () => {
  const r = build({ findingIds: ["5Q-F002"] });
  assert.notEqual(r.record.summary, CLEAN_TRAY_SUMMARY);
  assert.match(r.record.summary, /1 finding\(s\) frozen/);
  assert.deepEqual(validateSummary(r.record.summary).problems, []);
});

test("an empty summary is refused", () => {
  assert.equal(validateSummary("").ok, false);
  assert.equal(validateSummary(undefined).problems[0].kind, "missing_summary");
});

test("a tray that ran ZERO packs does NOT get the clean sentence", () => {
  // Found while building the first real trays. With an empty pack set, CLEAN_TRAY_SUMMARY is
  // VACUOUSLY TRUE — "no finding was produced by these admissible packs" is a true sentence about
  // zero packs, and it reads exactly like a tray that attacked everything and found nothing. That
  // is this stage's signature disease appearing inside the sentence written to prevent it.
  const r = build({ packIds: [], findingIds: [] });
  assert.notEqual(r.record.summary, CLEAN_TRAY_SUMMARY);
  assert.equal(r.record.summary, UNRUN_TRAY_SUMMARY);
  assert.match(r.record.summary, /no discharge is claimed/);
  assert.deepEqual(
    validateSummary(r.record.summary).problems,
    [],
    "and it is still honest wording"
  );
});
