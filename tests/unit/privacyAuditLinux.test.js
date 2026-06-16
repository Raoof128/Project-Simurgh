// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("privacy-audit DEFAULT_SCAN_DIRS includes the Linux daemon path", () => {
  const src = readFileSync("tools/privacy-audit.mjs", "utf8");
  const match = src.match(/DEFAULT_SCAN_DIRS\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, "DEFAULT_SCAN_DIRS constant not found");
  const list = match[1];
  assert.ok(
    list.includes("tools/simurgh-daemon-linux"),
    "DEFAULT_SCAN_DIRS missing tools/simurgh-daemon-linux"
  );
  assert.ok(
    list.includes("tests/fixtures/stage-2-8"),
    "DEFAULT_SCAN_DIRS missing tests/fixtures/stage-2-8"
  );
});

test("privacy-audit walk function skips target/ build directories", () => {
  const src = readFileSync("tools/privacy-audit.mjs", "utf8");
  // The walk function must have an explicit guard that short-circuits when
  // the directory basename is "target", so Rust build artifacts (which may
  // legitimately mention forbidden field names in crate doc comments) do not
  // create false positives.
  assert.ok(
    /target/.test(src) && /skip|exclude|ignore|return/i.test(src),
    "privacy-audit must skip target/ directories (look for an explicit guard)"
  );
});
