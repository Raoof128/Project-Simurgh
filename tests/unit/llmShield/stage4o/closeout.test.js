// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, constants } from "node:fs";
import { accessSync } from "node:fs";

const SCRIPT = "scripts/reproduce-llm-shield-stage4o.sh";

test("reproduce script exists and is executable", () => {
  const st = statSync(SCRIPT);
  assert.ok(st.isFile());
  accessSync(SCRIPT, constants.X_OK); // throws if not executable
});

test("reproduce script pins Node 26 and routes the final exit through the wrapper", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /node@26/);
  assert.match(src, />= 26/);
  assert.match(src, /stage4CodeForRawCode/);
  // Never a bare `exit 1`.
  assert.equal(/\bexit 1\b/.test(src), false);
});

test("reproduce script excludes non-regenerated fixtures from the cmp loop", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /grep -v "test-keys"/);
  assert.match(src, /grep -v "laneb"/);
});
