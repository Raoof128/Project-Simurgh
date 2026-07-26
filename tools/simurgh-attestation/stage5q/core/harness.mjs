// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — harness core: L2 closure binding and L4 admissibility.
//
// TWO RULES GOVERN EVERY PACK RUN, AND BOTH ARE REFUSALS.
//
//   L2 — a pack run against a closure digest other than the committed one is REFUSED OUTRIGHT. Not
//   warned about, not annotated. A result whose universe is not the frozen universe is a result
//   about a different stage, and pairing it with the commitment afterwards is how a coverage ratio
//   quietly changes denominator.
//
//   L4 — "No Green Without a Red". A pack whose attack class has no valid mutation receipt MAY
//   RUN — its output is still information — but its result is marked `inadmissible` and can never
//   be published as `attacked_pass`. A class nobody has proven detectable produces passes that mean
//   only "nothing happened", and "nothing happened" is what a broken detector says too.
//
// THE HARNESS DOES NOT EXECUTE PACKS (gauntlet P0-11). This module decides; node/runTray.mjs spawns.
// A red-team fixture is adversarial input BY CONSTRUCTION — it can crash the runner, mutate shared
// state, read credentials, reach the network, overwrite evidence, or poison every later pack in the
// run. R8, R9, R13, R15 and R16 are precisely the classes whose fixtures are DESIGNED to do those
// things. A harness that executes adversarial packs in its own process is a Stage 5Q finding waiting
// to be written about Stage 5Q.
//
// NO SHELL COMMAND EVER COMES FROM PACK JSON. This is the load-bearing line of the whole task: a
// pack format that can carry a shell string is a remote code execution primitive wearing a lanyard.
// Packs declare STRUCTURED operations against a closed registry, and anything outside it is rejected
// at schema validation, before execution.

import { createHash } from "node:crypto";
import { ATTACK_CLASSES, MUTANT_PRIMARY_CLASS } from "./constants.mjs";

/**
 * The closed operation registry. A pack says WHAT to do, never HOW to run it.
 *
 * Each entry lists the exact argument keys permitted. An unknown operation, or a known operation
 * with an unexpected key, is a schema rejection — the runner never sees it.
 */
export const PACK_OPERATIONS = Object.freeze({
  importModule: Object.freeze(["module_path"]),
  invokeExport: Object.freeze(["module_path", "export_name", "args"]),
  verifyArtifact: Object.freeze(["module_path", "export_name", "artifact_digest"]),
  compareRuntimes: Object.freeze(["module_path", "export_name", "args", "runtimes"]),
  parseFixture: Object.freeze(["fixture_digest"]),
});

/**
 * Field names that would smuggle executable text into a pack.
 *
 * Named explicitly and REFUSED rather than merely unrecognised: an unrecognised field is a schema
 * error a future maintainer might relax; a named prohibition explains itself.
 */
export const EXECUTABLE_FIELD_NAMES = Object.freeze([
  "command",
  "shell",
  "exec",
  "script",
  "eval",
  "run",
  "cmd",
  "argv",
  "entrypoint",
  "interpreter",
]);

/**
 * Deterministic exit mapping. There is deliberately no "non-zero means something happened".
 *
 * An unmapped exit is `unmapped_exit`, which INVALIDATES the run. Exit status alone cannot
 * distinguish "the detector caught the seeded flaw" from "the runner crashed for an unrelated
 * reason", and those two must never be confused: one discharges a class, the other voids the run.
 */
export const EXIT_MAP = Object.freeze({
  0: "pack_completed",
  1: "pack_reported_failure",
  2: "pack_refused_input",
  3: "pack_precondition_unmet",
});

export const OUTCOMES = Object.freeze([
  ...Object.values(EXIT_MAP),
  "timeout",
  "killed_by_signal",
  "output_cap_exceeded",
  "unmapped_exit",
]);

export function mapExit({ status, signal = null, timedOut = false, outputCapped = false }) {
  if (timedOut) return "timeout";
  if (outputCapped) return "output_cap_exceeded";
  if (signal) return "killed_by_signal";
  const mapped = EXIT_MAP[status];
  return mapped ?? "unmapped_exit";
}

/** Outcomes that void a run rather than describing one. */
export function isVoidingOutcome(outcome) {
  return ["unmapped_exit", "killed_by_signal", "output_cap_exceeded", "timeout"].includes(outcome);
}

/**
 * A mutation receipt is VALID only as a full green -> red -> green cycle (spec §7.2).
 *
 *   baseline_exit === 0   a mutant "detected" by an already-red suite proves nothing (§7.3)
 *   mutated_exit !== 0    otherwise the class is simply not discharged
 *   reverted + restored   a mutant left in place is not a proof, it is a regression
 */
export function isValidMutationReceipt(receipt) {
  const problems = [];
  if (receipt?.baseline_exit !== 0) {
    problems.push(
      "baseline_exit must be 0: a mutant 'detected' by an already-red suite proves nothing (§7.3)"
    );
  }
  if (!(receipt?.mutated_exit !== 0 && Number.isInteger(receipt?.mutated_exit))) {
    problems.push("mutated_exit must be a non-zero integer, or the class is not discharged");
  }
  if (receipt?.mutation_applied !== true) problems.push("mutation_applied must be true");
  if (receipt?.mutation_reverted !== true) {
    problems.push("a mutant left in place is not a proof, it is a regression");
  }
  if (receipt?.restored_exit !== 0) {
    problems.push("restored_exit must be 0: the tree must be green again afterwards");
  }
  for (const field of [
    "baseline_command",
    "mutated_command",
    "restored_command",
    "mutation_digest",
    "detecting_pack_id",
  ]) {
    if (!receipt?.[field]) problems.push(`missing ${field}`);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Which classes are discharged by these receipts.
 *
 * A receipt whose `detecting_pack_id` targets a DIFFERENT primary class does not discharge this one
 * (spec §7.1). Cross-class detections are secondary observations: useful, recorded, and not
 * currency. The mutants are in bijection with the classes precisely so that this stays checkable.
 */
export function admissibility(mutationReceipts = []) {
  const discharged = new Set();
  const rejected = [];

  for (const receipt of mutationReceipts) {
    const validity = isValidMutationReceipt(receipt);
    if (!validity.ok) {
      rejected.push({ mutant_id: receipt?.mutant_id ?? null, reason: validity.problems[0] });
      continue;
    }
    const primary = MUTANT_PRIMARY_CLASS[receipt.mutant_id];
    if (!primary) {
      rejected.push({
        mutant_id: receipt.mutant_id,
        reason: "mutant is not in the frozen bijection",
      });
      continue;
    }
    if (receipt.attack_class && receipt.attack_class !== primary) {
      rejected.push({
        mutant_id: receipt.mutant_id,
        reason:
          `receipt claims class ${receipt.attack_class} but ${receipt.mutant_id}'s primary class is ` +
          `${primary}. Cross-class detections are secondary observations, never discharge (§7.1).`,
      });
      continue;
    }
    discharged.add(primary);
  }

  const missing = ATTACK_CLASSES.filter((c) => !discharged.has(c));
  return {
    isAdmissible: (cls) => discharged.has(cls),
    dischargedClasses: [...discharged].sort(),
    missing,
    rejected,
    // L4, stated as a single boolean the ledger can consult before publishing anything.
    allClassesDischarged: missing.length === 0,
  };
}

/**
 * Bind a pack result to the universe it ran against, and decide whether it may be published.
 *
 * `runPack` is the async orchestration seam; everything it decides is computed here so the decision
 * is testable without spawning anything.
 */
export function decidePackResult({
  pack,
  closureDigest,
  committedClosureDigest,
  admissibility: adm,
  execution,
}) {
  if (closureDigest !== committedClosureDigest) {
    // L2. Refused outright — there is no annotated-but-kept path, because a result about a
    // different universe cannot be repaired by labelling it.
    return {
      refused: true,
      refusal_reason: "closure_digest_mismatch",
      detail:
        `pack ran against closure ${closureDigest} but the commitment is ${committedClosureDigest}. ` +
        `A result whose universe is not the frozen universe is a result about a different stage (L2).`,
      pack_id: pack?.attack_pack_id ?? null,
    };
  }

  const outcome = mapExit(execution);
  const classDischarged = adm.isAdmissible(pack.attack_class);
  const voided = isVoidingOutcome(outcome);

  return {
    refused: false,
    pack_id: pack.attack_pack_id,
    attack_class: pack.attack_class,
    target_scope: pack.target_scope,
    // Recorded on the RESULT, not merely checked, so a reviewer can verify the pairing later
    // without trusting that the check happened.
    closure_digest: closureDigest,
    outcome,
    observed_outcomes: execution.observed_outcomes ?? [],
    stdout_digest: execution.stdout_digest ?? null,
    stderr_digest: execution.stderr_digest ?? null,
    stdout_prefix: execution.stdout_prefix ?? "",
    stderr_prefix: execution.stderr_prefix ?? "",
    admissible: classDischarged && !voided,
    inadmissible_reason: classDischarged
      ? voided
        ? `run voided: ${outcome}`
        : null
      : `no valid mutation receipt discharges ${pack.attack_class}; this pack's passes mean only ` +
        `'nothing happened', which is also what a broken detector says (L4)`,
  };
}

/**
 * The single question the coverage ledger asks. Kept as its own function because "may this be
 * published as attacked_pass" is the decision L4 exists to constrain.
 */
export function canPublishAttackedPass(result) {
  if (result.refused) return false;
  if (!result.admissible) return false;
  return result.outcome === "pack_completed";
}

/**
 * Bounded, byte-stable capture of a stream.
 *
 * Digest PLUS bounded prefix (gauntlet P2-16): the exit code alone cannot tell a caught flaw from a
 * crash. No timings and no absolute paths enter a result — a "byte-stable" artifact containing
 * machine-varying text is neither.
 */
export function captureStream(buffer, { cap = 8192, prefix = 400 } = {}) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer ?? ""), "utf8");
  return {
    digest: createHash("sha256").update(bytes).digest("hex"),
    prefix: bytes.subarray(0, prefix).toString("utf8"),
    byte_length: bytes.length,
    capped: bytes.length > cap,
  };
}

/**
 * The isolation contract, as data.
 *
 * Exported so the driver cannot silently drop an element and so a test can assert every element is
 * present — a contract that lives only in a comment is a contract nothing checks.
 */
export const ISOLATION_CONTRACT = Object.freeze([
  "child_process_per_pack",
  "sanitized_environment_allowlist",
  "explicit_allowlisted_input_paths",
  "fresh_temporary_working_directory",
  "target_material_read_only",
  "wall_clock_timeout_enforced_by_parent",
  "stdout_stderr_byte_caps_recorded",
  "deterministic_exit_mapping",
  "cleanup_on_success_failure_timeout_and_signal",
  "no_shell_command_from_pack_json",
]);

/**
 * Schema check for the executable surface of a pack.
 *
 * Runs BEFORE execution, by construction: the runner is handed operations, never text.
 */
export function validatePackOperations(pack) {
  const problems = [];
  const operations = pack?.operations;

  if (!Array.isArray(operations) || operations.length === 0) {
    problems.push({
      kind: "no_operations",
      reason: "a pack that declares no operation does nothing; an empty list is not a small list",
    });
  }

  const scan = (value, path) => {
    if (value === null || typeof value !== "object") return;
    for (const key of Object.keys(value)) {
      if (EXECUTABLE_FIELD_NAMES.includes(key)) {
        problems.push({
          kind: "executable_field_in_pack",
          field: `${path}${key}`,
          reason:
            "a pack format that can carry a shell string is a remote code execution primitive " +
            "wearing a lanyard. Packs declare structured operations against a closed registry.",
        });
      }
      scan(value[key], `${path}${key}.`);
    }
  };
  scan(pack, "");

  for (const [i, op] of (operations ?? []).entries()) {
    const allowed = PACK_OPERATIONS[op?.operation];
    if (!allowed) {
      problems.push({
        kind: "unknown_operation",
        index: i,
        operation: op?.operation ?? null,
        reason:
          "the operation registry is closed; anything outside it is rejected before execution",
      });
      continue;
    }
    for (const key of Object.keys(op)) {
      if (key !== "operation" && !allowed.includes(key)) {
        problems.push({ kind: "unknown_operation_argument", index: i, argument: key });
      }
    }
    for (const key of allowed) {
      if (op[key] === undefined) {
        problems.push({ kind: "missing_operation_argument", index: i, argument: key });
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Run one pack.
 *
 * `execute` is INJECTED — it is the process-spawning half, and injecting it keeps every decision
 * above testable without spawning anything. The default is deliberately absent rather than
 * in-process: there is no accidental way to run a pack in this process.
 */
export async function runPack({
  pack,
  target,
  closureDigest,
  committedClosureDigest,
  admissibility: adm,
  execute,
}) {
  if (typeof execute !== "function") {
    throw new Error(
      "runPack requires an injected `execute`. There is no in-process default: a red-team fixture " +
        "is adversarial input by construction, and a harness that runs one in its own process is a " +
        "Stage 5Q finding waiting to be written about Stage 5Q (gauntlet P0-11)."
    );
  }
  const schema = validatePackOperations(pack);
  if (!schema.ok) {
    return {
      refused: true,
      refusal_reason: "pack_schema",
      pack_id: pack?.attack_pack_id ?? null,
      problems: schema.problems,
    };
  }
  if (closureDigest !== committedClosureDigest) {
    // Checked BEFORE execution as well as in decidePackResult: refusing after running an
    // adversarial fixture against the wrong universe is refusing too late.
    return decidePackResult({
      pack,
      closureDigest,
      committedClosureDigest,
      admissibility: adm,
      execution: {},
    });
  }
  const execution = await execute({ pack, target });
  return decidePackResult({
    pack,
    closureDigest,
    committedClosureDigest,
    admissibility: adm,
    execution,
  });
}
