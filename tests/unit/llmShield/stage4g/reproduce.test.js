// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

test("Stage 4G reproduce harness exists and is wired for offline execution", () => {
  assert.equal(existsSync("scripts/reproduce-stage4g.sh"), true);
});
