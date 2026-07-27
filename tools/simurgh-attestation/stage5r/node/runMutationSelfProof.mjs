// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Tasks 15 and 16: seed, observe red, revert, observe green.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs [--gates] [--output <path>]
//
// Default: the seven N-mutants (Task 15). With --gates: the nine gate seeds (Task 16).
//
// EVERY SEED IS APPLIED IN A SCRATCH WORKTREE (Ruling 5, P8). The primary tree is never written, not
// even briefly, so an interrupted run cannot leave a seeded defect behind in the tree everything else
// is measured against.
//
// These are RUNTIME RECEIPTS: produced once, not byte-reproducible, because they record process
// exits. Their canonical form is deterministic and independently replayable from the recorded seed
// and command, which is the honest version of "built twice" for something that executes.

import { execFileSync, execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { MUTANTS, GATE_SEEDS, applySeed } from "../core/mutants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const sha = (t) =>
  createHash("sha256")
    .update(Buffer.from(String(t), "utf8"))
    .digest("hex");

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = argv.indexOf("--output");
  const gates = argv.includes("--gates");
  return {
    gates,
    output:
      o === -1
        ? join(
            REPO,
            gates
              ? "docs/research/llm-shield/evidence/stage-5r/gate-red-states/red-states.json"
              : "docs/research/llm-shield/evidence/stage-5r/self-proof/n-receipts.json"
          )
        : argv[o + 1],
  };
}

/**
 * The only command shape a seed may carry.
 *
 * A shell IS needed here, because the commands run test globs (`stage5r/*.test.js`) that node
 * expands via the shell. That makes the command string an injection surface, so it is constrained
 * rather than trusted: every command must match this pattern exactly, which admits `node --test`
 * over a path under tests/ and nothing else — no metacharacters, no chaining, no redirection.
 *
 * The seeds are a frozen constant in this repository rather than user input, but "the input is
 * trusted" is an argument, and an enforced pattern is a control.
 */
const SAFE_COMMAND = /^node --test tests\/[A-Za-z0-9/._*-]+$/;

/** Run a command in a tree; a non-zero exit is a result, not an error. */
function run(cwd, command) {
  if (!SAFE_COMMAND.test(command)) {
    throw new Error(
      `self-proof: refusing to run "${command}" — it is not the permitted command shape`
    );
  }
  try {
    execSync(command, { cwd, stdio: "pipe", encoding: "utf8", timeout: 600000 });
    return { ok: true, exit: 0 };
  } catch (err) {
    return { ok: false, exit: err.status ?? 1 };
  }
}

/**
 * Seed one defect in a scratch worktree and observe the three states.
 *
 * @param {string} worktree
 * @param {object} seed
 * @returns {object} the receipt
 */
export function proveOne(worktree, seed) {
  const command = seed.command ?? `node --test ${seed.caught_by}`;
  const target = join(worktree, seed.file);
  const original = readFileSync(target, "utf8");

  const green = run(worktree, command);
  const seeded = applySeed(original, seed);
  if (seeded === original) throw new Error(`${seed.id ?? seed.gate}: the seed produced no change`);
  writeFileSync(target, seeded, "utf8");
  const red = run(worktree, command);
  writeFileSync(target, original, "utf8");
  const greenAgain = run(worktree, command);

  return {
    id: seed.id ?? seed.gate,
    intent: seed.intent ?? seed.asserts,
    file: seed.file,
    command,
    seed_digest: sha(seeded),
    original_digest: sha(original),
    restored: readFileSync(target, "utf8") === original,
    baseline_exit: green.exit,
    mutated_exit: red.exit,
    restored_exit: greenAgain.exit,
    caught: green.ok && !red.ok && greenAgain.ok,
    catching_check: seed.caught_by ?? seed.command,
    expected_catch: seed.expected_catch ?? seed.asserts,
  };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { gates, output } = parseArgs(argv);
  const seeds = gates ? GATE_SEEDS : MUTANTS;
  const worktree = mkdtempSync(join(tmpdir(), "5r-selfproof."));
  let receipts;
  try {
    execFileSync("git", ["worktree", "add", "--detach", worktree, "HEAD"], {
      cwd: REPO,
      stdio: "pipe",
    });
    const nm = join(REPO, "node_modules");
    if (existsSync(nm) && !existsSync(join(worktree, "node_modules"))) {
      symlinkSync(nm, join(worktree, "node_modules"), "dir");
    }
    receipts = seeds.map((s) => proveOne(worktree, s));
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", worktree], {
        cwd: REPO,
        stdio: "pipe",
      });
    } catch {
      rmSync(worktree, { recursive: true, force: true });
    }
  }

  const uncaught = receipts.filter((r) => !r.caught);
  const artifact = {
    schema: gates ? "simurgh.vpf.gate-red-states.v1" : "simurgh.vpf.self-proof.v1",
    note: gates
      ? "Task 16. Every gate implemented by the end of Task 15, seeded in a scratch worktree, " +
        "observed red, reverted, observed green. G8 and G9 belong to Task 26: proving the red state " +
        "of a gate that does not exist yet is a P5 violation this plan already made once."
      : "Task 15. The seven harness mutants, N5 split into its two independent failures. Seeded in " +
        "a scratch worktree; the primary tree is never written.",
    receipt_kind: "runtime",
    seeded_count: receipts.length,
    all_caught: uncaught.length === 0,
    uncaught: uncaught.map((r) => r.id),
    receipts,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(artifact)}\n`, "utf8");

  const lines = [`wrote ${output}`, ""];
  for (const r of receipts) {
    lines.push(
      `  ${r.caught ? "CAUGHT " : "MISSED "} ${String(r.id).padEnd(4)} ` +
        `green ${r.baseline_exit} → red ${r.mutated_exit} → green ${r.restored_exit}` +
        `${r.restored ? "" : "  [NOT RESTORED]"}`
    );
  }
  lines.push("");
  if (uncaught.length) lines.push(`  UNCAUGHT: ${uncaught.map((r) => r.id).join(", ")}`);
  process.stdout.write(`${lines.join("\n")}\n`);
  return uncaught.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
