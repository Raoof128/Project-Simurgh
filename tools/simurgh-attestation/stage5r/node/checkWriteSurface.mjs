// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 1: run the write-surface verifier over a git range.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs --range <base>..<head>
//   node tools/simurgh-attestation/stage5r/node/checkWriteSurface.mjs --range "$(git merge-base origin/main HEAD)..HEAD"
//
// Exit codes: 0 every change is on the surface; 1 at least one violation (each one named); 2 the
// range could not be resolved.
//
// The shared files are fetched at BOTH endpoints and handed to the core as before/after text, because
// the permission attaches to the edit rather than to the path. A file that cannot be read at an
// endpoint is passed as an empty string — added and deleted files are real cases, and treating a
// missing endpoint as "no change" would let a deletion pass unexamined.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkChangeSet, SHARED_FILES } from "../core/writeSurface.mjs";

/**
 * @param {string[]} args
 * @returns {string} git output, trimmed of the trailing newline only
 */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/**
 * File content at a revision, or "" when the path does not exist there.
 *
 * @param {string} rev
 * @param {string} path
 * @returns {string}
 */
function showOrEmpty(rev, path) {
  try {
    return git(["show", `${rev}:${path}`]);
  } catch {
    return "";
  }
}

/**
 * @param {string[]} argv
 * @returns {{ range: string|null, json: boolean }}
 */
export function parseArgs(argv) {
  const i = argv.indexOf("--range");
  return { range: i === -1 ? null : (argv[i + 1] ?? null), json: argv.includes("--json") };
}

/**
 * Collect the change set for a range, loading before/after text for shared files only.
 *
 * @param {string} range e.g. "abc123..HEAD"
 * @returns {Array<{path: string, before?: string, after?: string}>}
 */
export function collectChanges(range) {
  const [base, head = "HEAD"] = range.split("..");
  const names = git(["diff", "--name-only", range]).split("\n").filter(Boolean);
  return names.map((path) =>
    Object.prototype.hasOwnProperty.call(SHARED_FILES, path)
      ? { path, before: showOrEmpty(base, path), after: showOrEmpty(head, path) }
      : { path }
  );
}

/**
 * @param {string[]} argv
 * @returns {number} process exit code
 */
export function main(argv) {
  const { range, json } = parseArgs(argv);
  if (!range || !range.includes("..")) {
    process.stderr.write("usage: checkWriteSurface.mjs --range <base>..<head>\n");
    return 2;
  }
  let changes;
  try {
    changes = collectChanges(range);
  } catch (err) {
    process.stderr.write(`RANGE UNRESOLVED: ${err.message}\n`);
    return 2;
  }
  const result = checkChangeSet(changes);
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ range, files: changes.length, ...result }, null, 2)}\n`
    );
    return result.ok ? 0 : 1;
  }
  if (result.ok) {
    process.stdout.write(`WRITE SURFACE OK: ${changes.length} changed file(s) in ${range}\n`);
    return 0;
  }
  process.stderr.write(`WRITE SURFACE VIOLATIONS (${result.violations.length}) in ${range}:\n`);
  for (const v of result.violations) process.stderr.write(`  [${v.rule}] ${v.reason}\n`);
  return 1;
}

// Main guard from the first commit. Ten of 5Q's own drivers executed on import until K7-A found them.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
