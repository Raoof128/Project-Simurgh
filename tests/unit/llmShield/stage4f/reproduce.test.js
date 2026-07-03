// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("stage4f reproduce script has correct exit semantics and offline env", async () => {
  const source = await readFile("scripts/reproduce-stage4f.sh", "utf8");
  assert.match(source, /SIMURGH_STAGE4F_OFFLINE=1/);
  assert.match(source, /NO_NETWORK=1/);
  assert.match(source, /PYTHONHASHSEED=0/);
  assert.match(source, /exit 3/);
  assert.match(source, /SIMURGH_RUN_STAGE4F_FULL/);
});

test("the e2e gate runs the canary by default", async () => {
  // Stage 4D–4L end-to-end reproduce moved from check.sh to the dedicated e2e
  // gate (scripts/check-e2e.sh, run on Node 26 as a second CI step).
  const source = await readFile("scripts/check-e2e.sh", "utf8");
  assert.match(source, /reproduce-stage4f\.sh/);
});
