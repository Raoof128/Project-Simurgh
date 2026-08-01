#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — write-surface driver. The rule is pure and lives in core/; this file does the I/O:
// ask git what changed, hand it to the rule, print refusals, exit non-zero on any.
//
//   node .../checkWriteSurface.mjs --staged
//   node .../checkWriteSurface.mjs --range "$(git merge-base origin/main HEAD)..HEAD"
//   node .../checkWriteSurface.mjs --working
//
// THREE EXIT CODES, THREE MEANINGS (5S-F006). The first version of this driver had two, and the
// missing third hid two fail-opens found while running it during Task 11:
//
//   * an unrecognised flag was ignored, so `--base origin/main` quietly became `--staged`, examined
//     zero paths against a clean tree, and printed OK;
//   * every git call went through a swallow-and-return-"" helper, so a bogus revision range produced
//     zero changed paths — and zero changed paths violate nothing.
//
// Both printed green while checking nothing. A gate that reports pass because it could not run has
// not passed; it has not run. Exit 2 says so out loud, and it is deliberately distinct from exit 1:
// exit 1 is "the surface refused a change", exit 2 is "nobody checked".

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { judgeChanges, parseAnnexM, parseStageSurface } from "../core/writeSurface.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";

export const DRIVER_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

/** Strict by construction: a git failure THROWS. Nothing here may turn an error into an empty set. */
const runGitStrict = (args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();

/**
 * Parse argv. Unknown arguments are refused rather than ignored — a flag nobody recognises is a
 * request nobody honoured.
 *
 * @returns {{mode: string, range: string|null}|{error: string}}
 */
export function parseArgs(argv) {
  let mode = "staged";
  let range = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--staged") mode = "staged";
    else if (arg === "--working") mode = "working";
    else if (arg === "--range" || arg.startsWith("--range=")) {
      mode = "range";
      range = arg.includes("=") ? arg.slice("--range=".length) : argv[(i += 1)];
      if (!range) return { error: "--range requires a revision range" };
    } else {
      return { error: `unrecognised argument: ${arg}` };
    }
  }
  return { mode, range };
}

/** `git diff --name-status` → `{path, op}`; A is add, everything else is modify. */
function changedWithOps(runGit, mode, range) {
  const args =
    mode === "staged"
      ? ["diff", "--cached", "--name-status"]
      : mode === "working"
        ? ["diff", "--name-status"]
        : ["diff", "--name-status", range];
  return runGit(args)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [status, ...rest] = l.split("\t");
      return { path: rest[rest.length - 1], op: status.startsWith("A") ? "add" : "modify" };
    });
}

export function main(argv, deps = {}) {
  const runGit = deps.runGit ?? runGitStrict;

  const parsed = parseArgs(argv);
  if (parsed.error) {
    console.log(`Stage 5S write surface — NOT RUN: ${parsed.error}`);
    console.log("  usage: --staged | --working | --range <rev>..<rev>");
    return DRIVER_EXIT.OPERATOR_ERROR;
  }
  const { mode, range } = parsed;

  let changed;
  let dirty;
  try {
    changed = changedWithOps(runGit, mode, range);
    dirty = runGit(["status", "--porcelain"])
      .split("\n")
      .filter(Boolean)
      .map((l) => l.slice(3).trim());
  } catch (error) {
    console.log(`Stage 5S write surface — NOT RUN: git failed (${error.message})`);
    return DRIVER_EXIT.OPERATOR_ERROR;
  }

  const specText = readFileSync(SPEC, "utf8");
  const entries = [...parseStageSurface(specText), ...parseAnnexM(specText)];
  const result = judgeChanges({
    entries,
    changed,
    rangeCommitCount: changed.length,
    dirty,
    // Content, so the public-key exemption is decided by what the file IS rather than by its name.
    readFile: (path) => readFileSync(path, "utf8"),
  });

  console.log(`Stage 5S write surface — mode=${mode}${range ? ` range=${range}` : ""}`);
  console.log(`  surface rows: ${entries.length}  (Annex S + Annex M, parsed from the spec)`);
  console.log(`  paths examined: ${changed.length}`);

  if (result.ok) {
    console.log("  OK — every change is authorised by the declared surface");
    return DRIVER_EXIT.OK;
  }
  console.log(`  REFUSALS: ${result.refusals.length}`);
  for (const r of result.refusals) {
    console.log(
      `  ✗ ${r.reason}${r.path ? ` — ${r.path}` : ""}${r.detail ? ` (${r.detail})` : ""}`
    );
  }
  return DRIVER_EXIT.REFUSED;
}

// argv[1] is undefined under `node -e` / dynamic import; the unguarded form crashes every importer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
