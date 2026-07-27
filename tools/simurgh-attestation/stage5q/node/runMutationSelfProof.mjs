#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the mutation self-proof runner (Task 12, the L4 gate).
//
//   node .../runMutationSelfProof.mjs --all [--out <path>]
//   node .../runMutationSelfProof.mjs --verify-against-committed
//
// `--verify-against-committed` IS THE GATE CI SHOULD RUN, and `--all` is not.
//
// `--all` exits non-zero unless every mutant is detected, and two never are: M5 and M7 remove
// guards that are REDUNDANT with an immediately following check, so the suite stays green and the
// class cannot be discharged. That is a published finding — the attestation records R5 and R7 as
// `inadmissible_classes` — which makes 16-of-16 a gate that can never pass by the stage's own
// evidence. A gate that can never pass is a gate that gets deleted.
//
// The reproducible property is DRIFT: the same mutants must be detected today as when the receipts
// were signed. That catches what 16-of-16 never could — a mutant that silently stops being caught —
// and it fails if M5 or M7 ever START being detected too, because that also means the committed
// receipts no longer describe reality.
//
// Verify mode NEVER writes. A single-mutant run overwrote the committed sixteen-receipt file during
// this stage's own CI triage; the gate must not be able to do that.
//   node .../runMutationSelfProof.mjs --mutant M3
//
// For each mutant: run the detector in a CLEAN scratch worktree (must be GREEN), apply the
// structured mutation, run again (must be RED), revert, run again (must be GREEN). Any red->red or
// green->green FAILS the mutant — the first proves the detector was already broken, the second
// proves it cannot see the fault at all.
//
// MUTANTS ARE APPLIED IN A SCRATCH GIT WORKTREE AND REVERTED. No mutated source is ever committed;
// only descriptions, commands and observed exits enter evidence.
//
// BOTH TREES ARE CHECKED (gauntlet P2-15). `git status --short` in the primary worktree proves
// nothing about the scratch worktree. The runner asserts the primary is clean of source changes AND
// that the scratch worktree was removed.
//
// RECEIPTS CARRY BOUNDED LOGS (gauntlet P2-16). Exit code PLUS stdout/stderr digests and prefixes:
// exit status alone cannot distinguish "the detector caught the seeded flaw" from "the runner
// crashed for an unrelated reason", and one discharges a class while the other invalidates the run.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { applyMutation } from "../core/mutationAdapter.mjs";
import { isValidMutationReceipt, captureStream } from "../core/harness.mjs";
import { MUTANT_PRIMARY_CLASS } from "../core/constants.mjs";
import { makeFunctionId } from "../core/functionId.mjs";
import { stageFor } from "../core/censusStatic.mjs";

const REPO = process.cwd();
const MUTANTS_DIR = "tools/simurgh-attestation/stage5q/mutants";
const OUT_DEFAULT = "docs/research/llm-shield/evidence/stage-5q/mutation/receipts.json";
const DETECTOR_TIMEOUT_MS = 180_000;

let scratch = null;
const removeScratch = () => {
  if (!scratch) return;
  spawnSync("git", ["worktree", "remove", "--force", scratch], { cwd: REPO });
  rmSync(scratch, { recursive: true, force: true });
  scratch = null;
};
// Cleanup on success, failure, timeout AND signal.
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    removeScratch();
    process.exit(130);
  });
}
process.on("exit", removeScratch);

/** Expand a test directory into an explicit file list: `node --test <bare-dir>` does not work. */
function testFiles(root, dir) {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(".test.js"))
    .sort()
    .map((f) => join(dir, f));
}

/** Run one detector leg. Returns exit plus bounded, digested logs. */
function runDetector(root, spec) {
  const files = testFiles(root, spec.detector_glob);
  if (files.length === 0) {
    return {
      exit: 3,
      command: `node --test ${spec.detector_glob}/*.test.js`,
      note: "no test files",
    };
  }
  const res = spawnSync(process.execPath, ["--test", ...files], {
    cwd: root,
    shell: false,
    encoding: "buffer",
    timeout: DETECTOR_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    env: { PATH: process.env.PATH, NODE_ENV: "test", SIMURGH_SKIP_DOTENV: "1" },
  });
  const stdout = captureStream(res.stdout);
  const stderr = captureStream(res.stderr);
  return {
    exit: res.status ?? (res.signal ? 128 : 1),
    command: `node --test ${spec.detector_glob}/*.test.js  (${files.length} files)`,
    stdout_digest: stdout.digest,
    stderr_digest: stderr.digest,
    stdout_prefix: stdout.prefix.split("\n").slice(-4).join(" | ").slice(0, 240),
  };
}

function proveOne(spec) {
  removeScratch();
  scratch = join(REPO, ".git", "5q-mutation-scratch");
  rmSync(scratch, { recursive: true, force: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (add.status !== 0) {
    return { mutant_id: spec.mutant_id, error: `scratch worktree failed: ${add.stderr}` };
  }

  const targetPath = join(scratch, spec.target_file);
  const originalBytes = readFileSync(targetPath);
  const original = originalBytes.toString("utf8");

  // LEG 1 — baseline. Must be GREEN. A mutant "detected" by an already-red suite proves nothing.
  const baseline = runDetector(scratch, spec);

  let applied;
  try {
    applied = applyMutation({ source: original, sourceBytes: originalBytes, spec });
  } catch (error) {
    removeScratch();
    return { mutant_id: spec.mutant_id, error: String(error.message) };
  }
  writeFileSync(targetPath, applied.mutated);

  // LEG 2 — mutated. Must be RED.
  const mutatedLeg = runDetector(scratch, spec);

  // LEG 3 — restored. Must be GREEN again.
  writeFileSync(targetPath, originalBytes);
  const restored = runDetector(scratch, spec);
  const revertedClean =
    readFileSync(targetPath).equals(originalBytes) &&
    spawnSync("git", ["status", "--short", "--", spec.target_file], {
      cwd: scratch,
      encoding: "utf8",
    }).stdout.trim() === "";

  removeScratch();

  return {
    mutant_id: spec.mutant_id,
    attack_class: MUTANT_PRIMARY_CLASS[spec.mutant_id],
    // THE CANONICAL ID, `stage:path:symbol`. It was `path:symbol` — one field short — and every
    // one of the sixteen receipts named a target that could not be found in the committed closure.
    // The receipts looked complete, the closure looked complete, and nothing joined: the L4
    // evidence could not discharge a single L2 cell, and a coverage ledger consuming them would
    // have reported zero discharges with no indication that a JOIN had failed rather than an
    // attack. `makeFunctionId` is the only constructor, so a hand-built id cannot drift again.
    target_function_id: makeFunctionId({
      // The SAME derivation the census used to build the closure. A second, parallel rule for
      // "which stage is this file in" is a second answer waiting to disagree with the first.
      stageId: stageFor(spec.target_file),
      modulePath: spec.target_file,
      symbol: spec.target_symbol,
    }),
    intent: spec.intent,
    adapter: spec.adapter,
    expected_failure: spec.expected_failure,

    baseline_command: baseline.command,
    baseline_exit: baseline.exit,
    baseline_stdout_digest: baseline.stdout_digest ?? null,

    mutation_applied: true,
    mutation_digest: applied.mutation_digest,
    baseline_source_digest: applied.baseline_source_digest,
    mutated_source_digest: applied.mutated_source_digest,

    mutated_command: mutatedLeg.command,
    mutated_exit: mutatedLeg.exit,
    mutated_stdout_digest: mutatedLeg.stdout_digest ?? null,
    mutated_stdout_prefix: mutatedLeg.stdout_prefix ?? "",

    detecting_pack_id: `5q-sp-${MUTANT_PRIMARY_CLASS[spec.mutant_id].toLowerCase()}-01`,

    mutation_reverted: revertedClean,
    restored_command: restored.command,
    restored_exit: restored.exit,
    restored_stdout_digest: restored.stdout_digest ?? null,
  };
}

function main(argv) {
  const arg = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : null;
  };
  const only = arg("--mutant");
  const verifyOnly = argv.includes("--verify-against-committed");
  // A single-mutant run used to overwrite the committed sixteen-receipt file. It did, during this
  // stage's own CI triage. Verify mode writes nothing, and a targeted run writes only where asked.
  const out = verifyOnly ? null : (arg("--out") ?? OUT_DEFAULT);

  const specs = readdirSync(MUTANTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(MUTANTS_DIR, f), "utf8")))
    .filter((s) => !only || s.mutant_id === only)
    .sort((a, b) => Number(a.mutant_id.slice(1)) - Number(b.mutant_id.slice(1)));

  // BOTH TREES, MEASURED AS A DELTA (gauntlet P2-15). The first version asserted the primary tree
  // was CLEAN, which reported DIRTY on its very first real run — not because mutated source had
  // escaped, but because Stage 5Q's own in-progress files were uncommitted. An absolute cleanliness
  // check on a tree that is legitimately dirty is a check that cries wolf until somebody silences
  // it. The honest question is "did anything NEW appear", so the state is captured before and after.
  const primaryStatus = () =>
    spawnSync("git", ["status", "--short", "--", "tools/", "tests/", "proofs/", "scripts/"], {
      cwd: REPO,
      encoding: "utf8",
    }).stdout.trim();
  const primaryBefore = primaryStatus();

  console.log(`Stage 5Q mutation self-proof — ${specs.length} mutant(s)`);
  console.log("  each must go GREEN -> RED -> GREEN; red->red or green->green FAILS\n");

  const receipts = [];
  for (const spec of specs) {
    const receipt = proveOne(spec);
    receipts.push(receipt);
    if (receipt.error) {
      console.log(`  ${receipt.mutant_id}  ERROR  ${receipt.error.split("\n")[0]}`);
      continue;
    }
    const validity = isValidMutationReceipt(receipt);
    const legs = `${receipt.baseline_exit} -> ${receipt.mutated_exit} -> ${receipt.restored_exit}`;
    console.log(
      `  ${receipt.mutant_id.padEnd(4)} ${receipt.attack_class.padEnd(4)} ${legs.padEnd(14)} ` +
        `${validity.ok ? "DISCHARGED" : "FAILED"}  ${spec.target_file.split("/").slice(-1)[0]}`
    );
    if (!validity.ok) console.log(`         ${validity.problems[0]}`);
  }

  const primaryAfter = primaryStatus();
  const primaryUnchanged = primaryAfter === primaryBefore;
  const scratchGone = !existsSync(join(REPO, ".git", "5q-mutation-scratch"));

  const discharged = receipts.filter((r) => !r.error && isValidMutationReceipt(r).ok);
  console.log(`\n  discharged        : ${discharged.length}/${receipts.length}`);
  console.log(
    `  primary worktree  : ${primaryUnchanged ? "unchanged by the run" : "CHANGED — mutated source may have escaped"}`
  );
  console.log(`  scratch worktree  : ${scratchGone ? "removed" : "STILL PRESENT"}`);
  const undetected = receipts.filter((r) => !r.error && r.mutated_exit === 0);
  if (undetected.length > 0) {
    console.log(`\n  UNDETECTED MUTANTS — the most valuable output of Wave II:`);
    for (const r of undetected) {
      console.log(`    ${r.mutant_id} (${r.attack_class})  ${r.target_function_id}`);
      console.log(`      seeded: ${r.intent}`);
      console.log(
        `      the detector did not go red. STRENGTHEN THE PACK. Never weaken the mutant.`
      );
    }
  }

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      `${JSON.stringify(
        {
          schema: "simurgh.vsr.mutation-receipts.v1",
          note:
            "Each receipt is a full green -> red -> green cycle in a scratch git worktree. No mutated " +
            "source is ever committed; only descriptions, commands and observed exits enter evidence.",
          mutants_attempted: receipts.length,
          classes_discharged: discharged.map((r) => r.attack_class).sort(),
          primary_worktree_unchanged_by_run: primaryUnchanged,
          scratch_worktree_removed: scratchGone,
          receipts,
        },
        null,
        2
      )}\n`
    );
    console.log(`  written           : ${out}`);
  }

  if (verifyOnly) {
    const committedPath = OUT_DEFAULT;
    if (!existsSync(committedPath)) {
      console.log("\n  REFUSING: no committed receipts to verify against");
      return 1;
    }
    const committed = JSON.parse(readFileSync(committedPath, "utf8")).receipts;
    const observedMap = new Map(receipts.map((r) => [r.mutant_id, isValidMutationReceipt(r).ok]));
    const committedMap = new Map(committed.map((r) => [r.mutant_id, isValidMutationReceipt(r).ok]));
    const drifted = [...new Set([...observedMap.keys(), ...committedMap.keys()])]
      .sort()
      .filter((id) => observedMap.get(id) !== committedMap.get(id))
      .map(
        (id) =>
          `${id}: committed ${committedMap.get(id) ? "detected" : "undetected"}, ` +
          `observed ${observedMap.get(id) ? "detected" : "undetected"}`
      );

    console.log(`\n  VERIFY AGAINST COMMITTED RECEIPTS`);
    console.log(
      `      committed detections : ${[...committedMap.values()].filter(Boolean).length}/${committedMap.size}`
    );
    console.log(
      `      observed detections  : ${[...observedMap.values()].filter(Boolean).length}/${observedMap.size}`
    );
    if (drifted.length > 0) {
      console.log(`      DRIFT:`);
      for (const d of drifted) console.log(`        ✗ ${d}`);
      console.log(
        "\n      A mutant that stopped being detected means a detector regressed. One that STARTED\n" +
          "      being detected means the committed receipts no longer describe reality. Both are\n" +
          "      drift, and neither is fixed by re-running until the numbers agree."
      );
      return 1;
    }
    console.log(`      no drift — the same mutants are detected as when the receipts were signed`);
    console.log(`      R5 and R7 remain undischarged, as the attestation records`);
    return primaryUnchanged && scratchGone ? 0 : 1;
  }

  return discharged.length === receipts.length && primaryUnchanged && scratchGone ? 0 : 1;
}

// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
