// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 6: capture the prior-stage baseline at the PINNED predecessor commit.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyTransition.mjs --baseline 20fc323c [--output <path>]
//
// The baseline is captured in a detached worktree at the predecessor commit, NOT on the 5R branch.
// An earlier draft of the plan claimed the baseline was taken "before any 5R artifact perturbs
// anything" while five tasks had already written code, tests, a .prettierignore line and three
// evidence files. By the time this runs, the branch is not the predecessor, and pretending otherwise
// would make the comparison meaningless.
//
// THE MANIFEST IS A NAMED SUBSET, not the full prior-stage reproduce set. Running every predecessor's
// reproduce script takes the better part of ten minutes and belongs to check-e2e.sh at Tasks 25 and
// 27. Saying so here is the same discipline as `not_compared`: the scope of a check is part of its
// result.

import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, mkdirSync, symlinkSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { canonicalJson } from "../../canonicalise.mjs";
import { attribute, disturbance } from "../core/transition.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/transition/baseline.json"
);

/** The named subset. Node-only commands, so a worktree needs no build step to run them. */
export const MANIFEST = Object.freeze([
  { id: "stage5q-unit", command: "node --test tests/unit/llmShield/stage5q/*.test.js" },
  { id: "stage5p-unit", command: "node --test tests/unit/llmShield/stage5p/*.test.js" },
  { id: "stage5o-unit", command: "node --test tests/unit/llmShield/stage5o/*.test.js" },
]);

/** @param {string[]} argv */
export function parseArgs(argv) {
  const b = argv.indexOf("--baseline");
  const o = argv.indexOf("--output");
  return {
    baseline: b === -1 ? null : argv[b + 1],
    output: o === -1 ? DEFAULT_OUT : argv[o + 1],
  };
}

/**
 * Run the manifest in one tree. A non-zero exit is a result, not an error.
 *
 * @param {string} cwd
 * @returns {Array<{command: string, id: string, ok: boolean, exit: number}>}
 */
export function runManifest(cwd) {
  return MANIFEST.map((m) => {
    try {
      execSync(m.command, { cwd, stdio: "pipe", encoding: "utf8", timeout: 600000 });
      return { id: m.id, command: m.command, ok: true, exit: 0 };
    } catch (err) {
      return { id: m.id, command: m.command, ok: false, exit: err.status ?? 1 };
    }
  });
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { baseline, output } = parseArgs(argv);
  if (!baseline) {
    process.stderr.write("usage: verifyTransition.mjs --baseline <commit>\n");
    return 2;
  }
  const resolved = execFileSync("git", ["rev-parse", baseline], {
    cwd: REPO,
    encoding: "utf8",
  }).trim();
  const worktree = mkdtempSync(join(tmpdir(), "5r-baseline."));
  let baselineResults = null;
  try {
    execFileSync("git", ["worktree", "add", "--detach", worktree, resolved], {
      cwd: REPO,
      stdio: "pipe",
    });
    // Worktrees share .git but not node_modules. A symlink lets the predecessor's tests run without
    // installing anything, and it is a link rather than a copy so nothing is written into the tree.
    const nm = join(REPO, "node_modules");
    if (existsSync(nm) && !existsSync(join(worktree, "node_modules"))) {
      symlinkSync(nm, join(worktree, "node_modules"), "dir");
    }
    baselineResults = runManifest(worktree);
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

  const headResults = runManifest(REPO);
  const a = attribute({ results: headResults, baselineResults });
  const d = disturbance(a);

  const artifact = {
    schema: "simurgh.vpf.transition-baseline.v1",
    note:
      "Prior-stage non-disturbance. The baseline ran in a detached worktree at the pinned " +
      "predecessor commit; the candidate ran at 5R HEAD. The manifest is a NAMED SUBSET — the full " +
      "prior-stage reproduce set runs under check-e2e.sh at Tasks 25 and 27.",
    baseline_commit: resolved,
    manifest_is_a_subset: true,
    manifest: MANIFEST.map((m) => m.id),
    baseline_results: baselineResults,
    candidate_results: headResults,
    attribution: {
      green: a.green,
      regressed_by_5r: a.regressed_by_5r,
      pre_existing: a.pre_existing,
      not_compared: a.not_compared,
      not_comparable: a.not_comparable,
    },
    disturbed_a_prior_stage: d.disturbed,
    unverified_commands: d.unverified,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(artifact)}\n`, "utf8");

  process.stdout.write(
    [
      `wrote ${output}`,
      `  baseline ${resolved.slice(0, 8)} in a detached worktree, removed afterwards`,
      `  green ${a.green.length} · regressed_by_5r ${a.regressed_by_5r.length} · pre_existing ${a.pre_existing.length} · not_compared ${a.not_compared.length} · not_comparable ${a.not_comparable.length}`,
      `  disturbed a prior stage: ${d.disturbed}`,
      "",
    ].join("\n")
  );
  return d.disturbed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
