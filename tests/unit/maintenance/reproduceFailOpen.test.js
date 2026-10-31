// SPDX-License-Identifier: AGPL-3.0-or-later
// Guard: no reproduce script carries a top-level `cmd && echo OK` gate.
//
// Under `set -e` a failure in the non-final element of an `&&` list does not abort the script, so
// `cmd && echo OK` skips its echo and sails on to `ALL PASS` (the Stage 5E clean-room finding, the
// July 2026 sweep of 4Y–5D, and audit E-6 for 5L, 5M and 5R). A chain inside a subshell `( ... )`
// is fail-closed, because the subshell's own exit status aborts the script.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const scripts = readdirSync("scripts")
  .filter((name) => /^reproduce-.*\.sh$/.test(name))
  .sort();

test("every reproduce script is enumerated", () => {
  assert.ok(scripts.length >= 30, `only ${scripts.length} reproduce scripts found`);
});

for (const name of scripts) {
  test(`scripts/${name} has no top-level fail-open echo chain`, () => {
    const offending = readFileSync(`scripts/${name}`, "utf8")
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /&&\s*echo\b/.test(line))
      .filter(({ line }) => !/^\s*#/.test(line))
      .filter(({ line }) => !/\|\|/.test(line))
      .filter(({ line }) => !/^\s*(\(|if\b|elif\b|while\b|until\b)/.test(line));
    assert.deepEqual(
      offending.map(({ n, line }) => `${n}: ${line.trim()}`),
      [],
      "fail-open `cmd && echo` chains"
    );
  });
}
