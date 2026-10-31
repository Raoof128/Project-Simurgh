// SPDX-License-Identifier: AGPL-3.0-or-later
// Guard: every unit test file is matched by the `npm test` pattern.
//
// The script used to pass `tests/unit/**/*.test.js` unquoted. npm runs it through `sh`, which has
// no globstar, so `**` matched one directory and files three levels down never ran (pass-3 audit).
// This expands the script's arguments exactly as `sh` would, then as `node --test` would, and
// compares the result with every `*.test.js` under tests/unit.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { globSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function unitTestFiles(dir = "tests/unit") {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...unitTestFiles(path));
    else if (entry.name.endsWith(".test.js")) found.push(path);
  }
  return found;
}

function filesRunByNpmTest() {
  const script = JSON.parse(readFileSync("package.json", "utf8")).scripts.test;
  const match = /^node --test (.+)$/.exec(script);
  assert.ok(match, `unexpected npm test script: ${script}`);
  // Let sh do its quoting and globbing, then apply node's own glob to what survives.
  const argv = execFileSync("sh", ["-c", `printf '%s\\n' ${match[1]}`], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  const files = new Set();
  for (const arg of argv) {
    if (/[*?[]/.test(arg)) for (const path of globSync(arg)) files.add(path);
    else files.add(arg);
  }
  return files;
}

test("npm test runs every unit test file under tests/unit", () => {
  const run = filesRunByNpmTest();
  const missing = unitTestFiles()
    .filter((path) => !run.has(path))
    .sort();
  assert.deepEqual(missing, [], "unit test files the npm test pattern never runs");
});
