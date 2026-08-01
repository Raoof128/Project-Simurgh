// SPDX-License-Identifier: AGPL-3.0-or-later
//
// A TOOLCHAIN INSTALLED AFTER THE GATE THAT NEEDS IT IS NOT INSTALLED (finding 5S-F018).
//
// `.github/workflows/stage-1-checks.yml` ran `./scripts/check.sh` at step 114 and installed Lean at
// step 121. Stage 5S's proof assertions shell out to `lean` and to `scripts/check-lean-proofs.mjs`,
// so they failed closed in CI — `lean_gate_missing_lean_binary` — and passed on every developer
// machine with a toolchain. Four CI jobs reported `fail 2`; no local run reproduced it.
//
// The gate failing closed is CORRECT and is not what was repaired. The ordering was.
//
// This guard discovers the workflows rather than naming them, so a new workflow that runs a
// toolchain-dependent gate is covered the day it lands.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflows = () =>
  execFileSync("git", ["ls-files", ".github/workflows"], { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.ya?ml$/.test(f));

/**
 * Position of the first line that RUNS something.
 *
 * Only `run:` bodies count. A step NAMED "Run Simurgh quality gate (scripts/check.sh)" and a
 * `paths:` filter listing `scripts/check-lean-proofs.mjs` both mention the command without
 * executing it — the first draft of this guard counted them and reported two correct workflows as
 * offenders. Naming a command is not running it.
 */
function runsAt(text, needle) {
  const lines = text.split("\n");
  let blockIndent = -1; // inside a `run: |` block while indentation stays deeper than this
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S/);
    if (blockIndent >= 0 && indent >= 0 && indent <= blockIndent) blockIndent = -1;

    const trimmed = line.trimStart();
    if (trimmed.startsWith("#")) continue;

    const runMatch = /(^|\s)run:\s*(\|.*)?$/.test(line) || /(^|\s)run:\s+\S/.test(line);
    const inBlock = blockIndent >= 0;

    if (runMatch && /run:\s*\|/.test(line)) blockIndent = indent;
    if ((runMatch || inBlock) && line.includes(needle)) return i;
  }
  return -1;
}

test("[f018] every workflow that runs a Lean-dependent gate installs the toolchain FIRST", () => {
  const offenders = [];
  for (const file of workflows()) {
    const text = readFileSync(file, "utf8");

    // Steps that need `lean` on PATH: the repo-wide proof gate, or check.sh (which runs the unit
    // suite, and the unit suite contains proof assertions).
    const gate = runsAt(text, "check-lean-proofs.mjs");
    const checkSh = runsAt(text, "scripts/check.sh");
    const needsLean = [gate, checkSh].filter((i) => i >= 0);
    if (needsLean.length === 0) continue;

    const install = runsAt(text, "elan-init");
    if (install < 0) continue; // this workflow does not claim to provide a toolchain at all

    const earliestNeed = Math.min(...needsLean);
    if (install > earliestNeed) {
      offenders.push(
        `${file}: elan installed at line ${install + 1}, but a Lean-dependent gate runs at line ${earliestNeed + 1}`
      );
    }
  }
  assert.deepEqual(offenders, [], `toolchain installed too late:\n  ${offenders.join("\n  ")}`);
});

test("[f018] the guard is not vacuous — it inspects workflows that actually exist", () => {
  // A discovering guard that discovers nothing passes trivially. At least one committed workflow
  // must both install elan and run a Lean-dependent gate, or this file is asserting about nothing.
  const withBoth = workflows().filter((f) => {
    const t = readFileSync(f, "utf8");
    return (
      runsAt(t, "elan-init") >= 0 &&
      (runsAt(t, "check-lean-proofs.mjs") >= 0 || runsAt(t, "scripts/check.sh") >= 0)
    );
  });
  assert.ok(
    withBoth.length > 0,
    "no workflow both installs a toolchain and runs a gate needing it — the guard checks nothing"
  );
});

test("[f018] check.sh reports WHICH step failed, not only where the log stopped", () => {
  // A test runner's last 40 lines are its summary counters. A step reporting `fail 2` named neither
  // failure, and the CI artifact that would have carried the log was silently empty.
  const sh = readFileSync("scripts/check.sh", "utf8");
  assert.match(sh, /Failure lines from/, "check.sh no longer surfaces failure lines");
  assert.match(sh, /not ok \[0-9\]\+/, "the failure-line pattern does not match TAP output");
});

test("[f018] the failure-log artifact includes hidden files, or it uploads nothing", () => {
  // `.simurgh_check_logs` is a DOT directory and upload-artifact@v4 drops hidden files by default,
  // so every "Upload check logs on failure" reported "No files were found". Combined with
  // `if-no-files-found: ignore`, a broken upload was indistinguishable from a clean run.
  for (const file of workflows()) {
    const text = readFileSync(file, "utf8");
    if (!text.includes(".simurgh_check_logs")) continue;
    assert.match(
      text,
      /include-hidden-files:\s*true/,
      `${file} uploads a dot-directory without include-hidden-files: true`
    );
  }
});
