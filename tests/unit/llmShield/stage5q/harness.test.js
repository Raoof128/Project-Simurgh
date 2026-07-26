// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 11 — harness core: L2 closure binding and L4 admissibility.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runPack,
  decidePackResult,
  admissibility,
  canPublishAttackedPass,
  validatePackOperations,
  isValidMutationReceipt,
  mapExit,
  captureStream,
  PACK_OPERATIONS,
  EXECUTABLE_FIELD_NAMES,
  ISOLATION_CONTRACT,
  OUTCOMES,
} from "../../../../tools/simurgh-attestation/stage5q/core/harness.mjs";
import {
  ATTACK_CLASSES,
  MUTANT_IDS,
  MUTANT_PRIMARY_CLASS,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const CLOSURE = "5f4d4534".repeat(8);

const receipt = (mutant_id, over = {}) => ({
  mutant_id,
  baseline_command: "npm test",
  baseline_exit: 0,
  mutation_applied: true,
  mutation_digest: "d".repeat(64),
  mutated_command: "npm test",
  mutated_exit: 1,
  detecting_pack_id: `5q-sp-${MUTANT_PRIMARY_CLASS[mutant_id].toLowerCase()}-01`,
  mutation_reverted: true,
  restored_command: "npm test",
  restored_exit: 0,
  ...over,
});

const allReceipts = () => MUTANT_IDS.map((m) => receipt(m));

const pack = (over = {}) => ({
  attack_pack_id: "5q-5a-r1-01",
  attack_class: "R1",
  target_scope: "tray-5a",
  operations: [{ operation: "importModule", module_path: "tools/x.mjs" }],
  ...over,
});

const done = (over = {}) => ({ status: 0, observed_outcomes: ["rejected_unknown_key"], ...over });

const decide = (over = {}) =>
  decidePackResult({
    pack: pack(),
    closureDigest: CLOSURE,
    committedClosureDigest: CLOSURE,
    admissibility: admissibility(allReceipts()),
    execution: done(),
    ...over,
  });

// ---------------------------------------------------------------------------------------------
// L2 — a pack bound to the wrong universe is REFUSED OUTRIGHT
// ---------------------------------------------------------------------------------------------

test("a pack run against a closure digest ≠ the committed one is REFUSED OUTRIGHT", () => {
  // Not annotated and kept. A result whose universe is not the frozen universe is a result about a
  // different stage, and labelling it afterwards does not repair it.
  const r = decide({ closureDigest: "b".repeat(64) });
  assert.equal(r.refused, true);
  assert.equal(r.refusal_reason, "closure_digest_mismatch");
  assert.match(r.detail, /different stage/);
  assert.equal(canPublishAttackedPass(r), false);
});

test("a pack result RECORDS the closure digest it ran against", () => {
  // Recorded, not merely checked: a reviewer verifies the pairing without trusting that the check
  // happened.
  assert.equal(decide().closure_digest, CLOSURE);
});

test("runPack refuses BEFORE executing when the closure does not match", async () => {
  // Refusing after running an adversarial fixture against the wrong universe is refusing too late.
  let executed = false;
  const r = await runPack({
    pack: pack(),
    closureDigest: "b".repeat(64),
    committedClosureDigest: CLOSURE,
    admissibility: admissibility(allReceipts()),
    execute: async () => {
      executed = true;
      return done();
    },
  });
  assert.equal(executed, false, "the fixture must never run against the wrong universe");
  assert.equal(r.refused, true);
});

// ---------------------------------------------------------------------------------------------
// L4 — no green without a red
// ---------------------------------------------------------------------------------------------

test("a pack whose class has NO mutation receipt MAY RUN, but is marked inadmissible", () => {
  // It may run: its output is still information. It may not be PUBLISHED as attacked_pass, because
  // its passes mean only "nothing happened" — which is also what a broken detector says.
  const adm = admissibility([]);
  const r = decide({ admissibility: adm });
  assert.equal(r.refused, false, "it runs");
  assert.equal(r.outcome, "pack_completed");
  assert.equal(r.admissible, false);
  assert.match(r.inadmissible_reason, /nothing happened|broken detector/);
  assert.equal(canPublishAttackedPass(r), false, "and it cannot be published as attacked_pass");
});

test("with a valid receipt for its class, a completed pack CAN be published", () => {
  const r = decide();
  assert.equal(r.admissible, true);
  assert.equal(r.inadmissible_reason, null);
  assert.equal(canPublishAttackedPass(r), true);
});

test("admissibility is per CLASS — a receipt for R1 does not admit an R7 pack", () => {
  const adm = admissibility([receipt("M1")]);
  assert.equal(adm.isAdmissible("R1"), true);
  assert.equal(adm.isAdmissible("R7"), false);
  assert.equal(adm.missing.length, 15);
  assert.equal(adm.allClassesDischarged, false);
});

test("all sixteen classes discharged sets allClassesDischarged", () => {
  const adm = admissibility(allReceipts());
  assert.deepEqual(adm.missing, []);
  assert.equal(adm.allClassesDischarged, true);
  assert.deepEqual(adm.dischargedClasses.sort(), [...ATTACK_CLASSES].sort());
});

test("a cross-class receipt does NOT discharge the class it claims (spec §7.1)", () => {
  // Cross-class detections are secondary observations: useful, recorded, never currency. The
  // mutants are in bijection with the classes precisely so this stays checkable.
  const adm = admissibility([receipt("M1", { attack_class: "R7" })]);
  assert.equal(adm.isAdmissible("R7"), false);
  assert.equal(
    adm.isAdmissible("R1"),
    false,
    "and it does not silently discharge its own class either"
  );
  assert.match(adm.rejected[0].reason, /primary class is R1|secondary observations/);
});

test("a mutant outside the frozen bijection discharges nothing", () => {
  const adm = admissibility([receipt("M1", { mutant_id: "M99" })]);
  assert.deepEqual(adm.dischargedClasses, []);
  assert.match(adm.rejected[0].reason, /frozen bijection/);
});

// ---------------------------------------------------------------------------------------------
// Mutation receipt validity — green -> red -> green, all three legs
// ---------------------------------------------------------------------------------------------

test("baseline_exit != 0 INVALIDATES the receipt (spec §7.3)", () => {
  // A mutant "detected" by an already-red suite proves nothing: the suite was going to be red
  // whatever you did to the source.
  const v = isValidMutationReceipt(receipt("M1", { baseline_exit: 1 }));
  assert.equal(v.ok, false);
  assert.match(v.problems[0], /already-red suite proves nothing/);
  assert.deepEqual(admissibility([receipt("M1", { baseline_exit: 1 })]).dischargedClasses, []);
});

test("mutated_exit == 0 means the class is NOT discharged", () => {
  const v = isValidMutationReceipt(receipt("M1", { mutated_exit: 0 }));
  assert.equal(v.ok, false);
  assert.deepEqual(admissibility([receipt("M1", { mutated_exit: 0 })]).dischargedClasses, []);
});

test("a receipt missing the RESTORE leg is invalid — a mutant left in place is a regression", () => {
  for (const broken of [{ mutation_reverted: false }, { restored_exit: 1 }]) {
    const v = isValidMutationReceipt(receipt("M1", broken));
    assert.equal(v.ok, false, JSON.stringify(broken));
  }
  assert.match(
    isValidMutationReceipt(receipt("M1", { mutation_reverted: false })).problems[0],
    /not a proof, it is a regression/
  );
});

test("every frozen-shape field is required in a receipt", () => {
  for (const field of [
    "baseline_command",
    "mutated_command",
    "restored_command",
    "mutation_digest",
    "detecting_pack_id",
  ]) {
    const r = receipt("M1");
    delete r[field];
    assert.equal(isValidMutationReceipt(r).ok, false, field);
  }
});

// ---------------------------------------------------------------------------------------------
// NO SHELL FROM PACK JSON — the load-bearing line
// ---------------------------------------------------------------------------------------------

test("a pack carrying ANY executable field is refused before execution", async () => {
  // A pack format that can carry a shell string is a remote code execution primitive wearing a
  // lanyard. Every name is refused, and nested placement does not help.
  for (const field of EXECUTABLE_FIELD_NAMES) {
    const r = validatePackOperations(pack({ [field]: "rm -rf /" }));
    assert.equal(r.ok, false, field);
    assert.equal(r.problems[0].kind, "executable_field_in_pack");
  }
  const nested = validatePackOperations(
    pack({ operations: [{ operation: "importModule", module_path: "x", command: "curl evil" }] })
  );
  assert.ok(nested.problems.some((p) => p.kind === "executable_field_in_pack"));
});

test("runPack refuses a pack with an executable field WITHOUT executing it", async () => {
  let executed = false;
  const r = await runPack({
    pack: pack({ shell: "id" }),
    closureDigest: CLOSURE,
    committedClosureDigest: CLOSURE,
    admissibility: admissibility(allReceipts()),
    execute: async () => {
      executed = true;
      return done();
    },
  });
  assert.equal(executed, false);
  assert.equal(r.refused, true);
  assert.equal(r.refusal_reason, "pack_schema");
});

test("an operation outside the CLOSED registry is refused", () => {
  const r = validatePackOperations(
    pack({ operations: [{ operation: "spawnHelper", module_path: "x" }] })
  );
  assert.equal(r.problems[0].kind, "unknown_operation");
  assert.match(r.problems[0].reason, /registry is closed/);
});

test("a known operation with an unexpected or missing argument is refused", () => {
  const extra = validatePackOperations(
    pack({ operations: [{ operation: "importModule", module_path: "x", extra: 1 }] })
  );
  assert.equal(extra.problems[0].kind, "unknown_operation_argument");

  const missing = validatePackOperations(pack({ operations: [{ operation: "invokeExport" }] }));
  assert.ok(missing.problems.every((p) => p.kind === "missing_operation_argument"));
  assert.equal(missing.problems.length, PACK_OPERATIONS.invokeExport.length);
});

test("a pack that declares NO operation is refused — an empty list is not a small list", () => {
  assert.equal(validatePackOperations(pack({ operations: [] })).problems[0].kind, "no_operations");
});

test("runPack has NO in-process default — omitting `execute` throws", async () => {
  await assert.rejects(
    () =>
      runPack({
        pack: pack(),
        closureDigest: CLOSURE,
        committedClosureDigest: CLOSURE,
        admissibility: admissibility(allReceipts()),
      }),
    /adversarial input by construction|no in-process default/i
  );
});

// ---------------------------------------------------------------------------------------------
// Deterministic exit mapping — no "non-zero means something happened"
// ---------------------------------------------------------------------------------------------

test("exits map deterministically, and an UNMAPPED exit voids the run", () => {
  assert.equal(mapExit({ status: 0 }), "pack_completed");
  assert.equal(mapExit({ status: 1 }), "pack_reported_failure");
  assert.equal(mapExit({ status: 2 }), "pack_refused_input");
  assert.equal(mapExit({ status: 3 }), "pack_precondition_unmet");
  assert.equal(mapExit({ status: 77 }), "unmapped_exit");
  assert.equal(mapExit({ status: null, signal: "SIGKILL" }), "killed_by_signal");
  assert.equal(mapExit({ status: 0, timedOut: true }), "timeout");
  assert.equal(mapExit({ status: 0, outputCapped: true }), "output_cap_exceeded");
  for (const o of OUTCOMES) assert.equal(typeof o, "string");
});

test("a VOIDED run is inadmissible even when its class is fully discharged", () => {
  // Exit status alone cannot distinguish "the detector caught the seeded flaw" from "the runner
  // crashed for an unrelated reason". One discharges a class; the other voids the run.
  for (const execution of [
    { status: 77 },
    { status: null, signal: "SIGKILL" },
    { status: 0, timedOut: true },
    { status: 0, outputCapped: true },
  ]) {
    const r = decide({ execution });
    assert.equal(r.admissible, false, JSON.stringify(execution));
    assert.match(r.inadmissible_reason, /run voided/);
    assert.equal(canPublishAttackedPass(r), false);
  }
});

test("a pack that REPORTED FAILURE is admissible but is not an attacked_pass", () => {
  const r = decide({ execution: { status: 1 } });
  assert.equal(r.admissible, true, "the run itself was sound");
  assert.equal(canPublishAttackedPass(r), false, "but it did not pass");
});

// ---------------------------------------------------------------------------------------------
// Bounded, byte-stable capture (gauntlet P2-16, P2-5)
// ---------------------------------------------------------------------------------------------

test("streams are captured as digest PLUS bounded prefix, with the length recorded", () => {
  const c = captureStream(Buffer.from("x".repeat(20000)), { cap: 8192, prefix: 10 });
  assert.match(c.digest, /^[0-9a-f]{64}$/);
  assert.equal(c.prefix.length, 10);
  assert.equal(c.byte_length, 20000);
  assert.equal(c.capped, true);
});

test("capture is deterministic and carries no timing or path", () => {
  const a = captureStream("ok");
  const b = captureStream("ok");
  assert.deepEqual(a, b);
  assert.equal(a.capped, false);
});

// ---------------------------------------------------------------------------------------------
// The isolation contract is DATA, so a test can assert every element survived
// ---------------------------------------------------------------------------------------------

test("every element of the isolation contract is present and named", () => {
  // A contract that lives only in a comment is a contract nothing checks.
  assert.equal(ISOLATION_CONTRACT.length, 10);
  for (const required of [
    "child_process_per_pack",
    "sanitized_environment_allowlist",
    "fresh_temporary_working_directory",
    "target_material_read_only",
    "wall_clock_timeout_enforced_by_parent",
    "deterministic_exit_mapping",
    "cleanup_on_success_failure_timeout_and_signal",
    "no_shell_command_from_pack_json",
  ]) {
    assert.ok(ISOLATION_CONTRACT.includes(required), `${required} must be in the contract`);
  }
});
