#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — write-surface driver. The rule is pure and lives in core/; this file does the I/O:
// ask git what changed, hand it to the rule, print refusals, exit non-zero on any.
//
//   node .../checkWriteSurface.mjs --staged
//   node .../checkWriteSurface.mjs --range "$(git merge-base origin/main HEAD)..HEAD"
//   node .../checkWriteSurface.mjs --working

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { judgeChanges, parseAnnexM, parseStageSurface } from "../core/writeSurface.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";

const git = (args, fallback = "") => {
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();
  } catch {
    return fallback;
  }
};

/** `git diff --name-status` → `{path, op}`; A is add, everything else is modify. */
function changedWithOps(mode, range) {
  const args =
    mode === "staged"
      ? ["diff", "--cached", "--name-status"]
      : mode === "working"
        ? ["diff", "--name-status"]
        : ["diff", "--name-status", range];
  return git(args)
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [status, ...rest] = l.split("\t");
      return { path: rest[rest.length - 1], op: status.startsWith("A") ? "add" : "modify" };
    });
}

export function main(argv) {
  let mode = "staged";
  let range = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--staged") mode = "staged";
    else if (argv[i] === "--working") mode = "working";
    else if (argv[i].startsWith("--range")) {
      mode = "range";
      range = argv[i].includes("=") ? argv[i].split("=")[1] : argv[i + 1];
    }
  }

  const specText = readFileSync(SPEC, "utf8");
  const entries = [...parseStageSurface(specText), ...parseAnnexM(specText)];
  const changed = changedWithOps(mode, range);
  const dirty = git(["status", "--porcelain"])
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).trim());

  const result = judgeChanges({ entries, changed, rangeCommitCount: changed.length, dirty });

  console.log(`Stage 5S write surface — mode=${mode}${range ? ` range=${range}` : ""}`);
  console.log(`  surface rows: ${entries.length}  (Annex S + Annex M, parsed from the spec)`);
  console.log(`  paths examined: ${changed.length}`);

  if (result.ok) {
    console.log("  OK — every change is authorised by the declared surface");
    return 0;
  }
  console.log(`  REFUSALS: ${result.refusals.length}`);
  for (const r of result.refusals) {
    console.log(
      `  ✗ ${r.reason}${r.path ? ` — ${r.path}` : ""}${r.detail ? ` (${r.detail})` : ""}`
    );
  }
  return 1;
}

// argv[1] is undefined under `node -e` / dynamic import; the unguarded form crashes every importer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
