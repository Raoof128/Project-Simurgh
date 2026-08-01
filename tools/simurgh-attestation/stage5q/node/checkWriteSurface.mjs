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
import {
  authorityPrecedesAction,
  judgeMaintenance,
  parseMaintenanceSurface,
} from "../core/maintenanceSurface.mjs";
import { freezeReceipt } from "../core/frozenBlock.mjs";

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

  // ANTI-VACUITY (Annex A5.2). A gate that examined nothing while the working tree carries changes
  // has not passed — it has not run. This is exactly how the Q1-F001 repair was verified "21/21"
  // with its work uncommitted: gates 2 and 3 diffed an empty range and printed green.
  //
  // 5S-F016: this guard was `mode === "range" && ...`, and `staged` is the DEFAULT mode — so the
  // bare invocation, which is what a human types, was the one mode NOT covered. Demonstrated by
  // control over one dirty tree: `--range HEAD..HEAD` refused and exited 1 while the bare call
  // printed `paths examined: 0 / OK` and exited 0. Every mode is guarded now, because the property
  // that matters is "nothing was examined while something had changed", and that is mode-agnostic.
  if (result.checked === 0) {
    const dirty = gitText(["status", "--porcelain"]);
    if (dirty) {
      console.log("  REFUSING: uncommitted_changes_not_evaluated");
      console.log(
        `    the ${mode} change set is empty and the working tree is not. Commit or stage the ` +
          "work, or the gate is reporting on a change set that does not include it."
      );
      return 1;
    }
  }

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
    // Annex A5. Before refusing, ask whether every UNDECLARED path is authorised maintenance. The
    // annex is read from the spec, never re-declared here, and its authority only counts if the
    // commit carrying it precedes the commits it authorises.
    const m = judgeMaintenanceRange(cmp.undeclared, mode, range);
    if (m.applicable) {
      if (m.verdict.ok) {
        console.log(
          `\n  ANNEX A5 (maintenance): all ${cmp.undeclared.length} path(s) authorised by name, ` +
            "operation matched, authority precedes action — accepted"
        );
        console.log("  this is NOT Q1: no transition claimed, no obligation discharged");
        return 0;
      }
      console.log("\n  ANNEX A5 (maintenance) REFUSES this change:");
      for (const r of m.verdict.refusals) {
        console.log(
          `    ✗ ${r.reason}${r.path ? ` — ${r.path}` : ""}${r.detail ? ` (${r.detail})` : ""}`
        );
      }
      return 1;
    }

    console.log(`  UNDECLARED: ${cmp.undeclared.join(", ")}`);
    console.log("  a new violation may not hide behind a declared one");
    return 1;
  }
  return 1;
}

const SPEC = "docs/superpowers/specs/2026-07-26-stage-5q-vsr-stage-wide-red-team-design.md";
const FREEZE_DIGEST = "da78774b77495459e4889e1c433e1933bb502ac81c9e5c0811e2450af7fdfc74";
/** T1-T7 live here. A maintenance change may not touch the transition it declines to claim. */
const TRANSITION_FILES = "tools/simurgh-attestation/stage5q/core/transition.mjs";

function gitText(args, fallback = "") {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

/** The operation git performed on a path across the range: `add` for A, `modify` for everything else. */
function operationFor(path, range) {
  const status = gitText(["diff", "--name-status", range, "--", path]).split("\n")[0] ?? "";
  return status.startsWith("A") ? "add" : "modify";
}

/**
 * Gather the git-side facts A5 needs, then judge. Applicable only to a commit range: the annex is a
 * statement about commits, and "authority precedes action" is meaningless over a dirty worktree.
 */
function judgeMaintenanceRange(undeclared, mode, range) {
  if (mode !== "range" || !range || undeclared.length === 0) return { applicable: false };

  const specText = (() => {
    try {
      return readFileSync(SPEC, "utf8");
    } catch {
      return "";
    }
  })();
  const { present, entries } = parseMaintenanceSurface(specText);
  if (!present) return { applicable: false };

  const [base, head = "HEAD"] = range.split("..");
  const commits = gitText(["rev-list", `${base}..${head}`])
    .split("\n")
    .filter(Boolean);

  // The commit that introduced A5, and the first commit touching any path it authorises.
  const specCommits = gitText(["log", "--reverse", "--format=%H", `${base}..${head}`, "--", SPEC])
    .split("\n")
    .filter(Boolean);
  const annexCommit = specCommits.find((c) =>
    gitText(["show", `${c}:${SPEC}`]).includes("## Annex A5")
  );

  const authorised = new Set(entries.map((e) => e.path));
  const firstTouch = gitText([
    "log",
    "--reverse",
    "--format=%H",
    `${base}..${head}`,
    "--",
    ...[...authorised],
  ])
    .split("\n")
    .filter(Boolean)[0];

  // Is the annex already at the base? Then it predates the whole branch, which is the normal case
  // once it has been merged to main — and the case the first implementation could not see.
  const annexPresentAtBase = gitText(["show", `${base}:${SPEC}`]).includes("## Annex A5");

  // `merge-base --is-ancestor` answers by EXIT CODE and prints nothing, so a thrown call (non-zero)
  // returns the sentinel and an empty string means "yes, ancestor".
  const annexIsAncestorOfFirstTouch = Boolean(
    annexCommit &&
    firstTouch &&
    gitText(["merge-base", "--is-ancestor", annexCommit, firstTouch], "ANCESTOR_FALSE") !==
      "ANCESTOR_FALSE"
  );

  const authorityPrecedes = authorityPrecedesAction({
    annexPresentAtBase,
    annexCommitInRange: annexCommit ?? null,
    firstTouchCommit: firstTouch ?? null,
    annexIsAncestorOfFirstTouch,
  });

  // Uncommitted work touching an authorised path was never evaluated by the range above.
  const dirty = gitText(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).trim())
    .filter((p) => authorised.has(p));

  const verdict = judgeMaintenance({
    entries,
    outsideQ0: undeclared.map((p) => ({ path: p, op: operationFor(p, range) })),
    rangeCommitCount: commits.length,
    uncommittedPaths: dirty,
    frozenSectionsIntact: freezeReceipt(specText).digest === FREEZE_DIGEST,
    transitionIntact: gitText(["diff", "--name-only", range, "--", TRANSITION_FILES]).length === 0,
    q1Authorised: false,
    authorityPrecedes,
  });
  return { applicable: true, verdict };
}

// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
