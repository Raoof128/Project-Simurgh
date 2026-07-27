#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 1.2 — write-surface driver.
//
// The rule lives in core/writeSurface.mjs and is pure. This file does the I/O: ask git what changed,
// hand the paths to the rule, print violations, exit non-zero if any.
//
// Run before every Q0 commit, and inside both reproduce scripts.
//
//   node .../checkWriteSurface.mjs --staged              what is about to be committed
//   node .../checkWriteSurface.mjs --range A..B          a commit range
//   node .../checkWriteSurface.mjs --working             unstaged working tree
//
// Exit 0 = every changed path is inside the spec §6.1 surface. Exit 1 = at least one is not.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  checkPaths,
  checkPackageJsonMutation,
  compareToDeclared,
  DECLARED_VIOLATIONS,
} from "../core/writeSurface.mjs";

const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function changedPaths(mode, range) {
  if (mode === "staged") return git(["diff", "--cached", "--name-only"]);
  if (mode === "working") return git(["diff", "--name-only"]);
  if (mode === "range") return git(["diff", "--name-only", range]);
  throw new Error(`unknown mode: ${mode}`);
}

/** Read package.json at a git revision; `null` when it did not exist there. */
function packageJsonAt(rev) {
  try {
    return JSON.parse(execFileSync("git", ["show", `${rev}:package.json`], { encoding: "utf8" }));
  } catch {
    return null;
  }
}

function main(argv) {
  let mode = "staged";
  let range = null;
  for (const arg of argv) {
    if (arg === "--staged") mode = "staged";
    else if (arg === "--working") mode = "working";
    else if (arg.startsWith("--range")) {
      mode = "range";
      range = arg.includes("=") ? arg.split("=")[1] : argv[argv.indexOf(arg) + 1];
    }
  }

  const paths = changedPaths(mode, range);
  const result = checkPaths(paths);

  // package.json is path-permitted but mutation-scoped. Checking the path alone would let a
  // dependency swap through under cover of "I only touched package.json".
  let pkgResult = { ok: true, violations: [] };
  if (paths.includes("package.json")) {
    const baseRev = mode === "range" && range ? range.split("..")[0] : "HEAD";
    const before = packageJsonAt(baseRev);
    const after =
      mode === "range" && range
        ? packageJsonAt(range.split("..")[1] || "HEAD")
        : JSON.parse(readFileSync("package.json", "utf8"));
    if (before && after) pkgResult = checkPackageJsonMutation(before, after);
  }

  const violations = [...result.violations, ...pkgResult.violations];

  console.log(`Q0 write surface — mode=${mode}${range ? ` range=${range}` : ""}`);
  console.log(`  paths examined: ${result.checked}`);

  if (violations.length === 0) {
    console.log("  OK — every change is inside the spec §6.1 write surface");
    return 0;
  }

  console.log(`  VIOLATIONS: ${violations.length}`);
  for (const v of violations) {
    console.log(`\n  ✗ ${v.path}`);
    console.log(`    ${v.reason}`);
  }

  // --allow-declared: pass iff the observed set is EXACTLY the declared one. The declaration lives
  // in core/writeSurface.mjs, so a caller (and CI) names no individual file — a gate that
  // enumerated its own exceptions would be F001 one level down.
  if (argv.includes("--allow-declared")) {
    const cmp = compareToDeclared(violations.map((v) => v.path));
    console.log(`\n  declared violations: ${DECLARED_VIOLATIONS.length}`);
    if (cmp.repaired.length > 0) {
      // Reported, not failed: a declaration that outlives its violation is stale, and stale is a
      // different problem from new.
      console.log(`  STALE DECLARATION — no longer violated: ${cmp.repaired.join(", ")}`);
    }
    if (cmp.ok) {
      console.log("  exactly the declared set, unrepaired and named — accepted");
      return 0;
    }
    console.log(`  UNDECLARED: ${cmp.undeclared.join(", ")}`);
    console.log("  a new violation may not hide behind a declared one");
    return 1;
  }
  return 1;
}

// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
