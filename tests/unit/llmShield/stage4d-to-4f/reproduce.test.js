// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("integrated reproduce script runs stage gates and scrubs offline env", async () => {
  const source = await readFile("scripts/reproduce-stage4d-to-4f.sh", "utf8");
  assert.match(source, /reproduce-stage4d\.sh/);
  assert.match(source, /reproduce-stage4e\.sh/);
  assert.match(source, /reproduce-stage4f\.sh/);
  assert.match(source, /SIMURGH_RUN_STAGE4F_FULL/);
  assert.match(source, /env -u OPENAI_API_KEY/);
  assert.match(source, /-u ANTHROPIC_API_KEY/);
  assert.match(source, /TZ=UTC/);
  assert.match(source, /SOURCE_DATE_EPOCH=0/);
  assert.match(source, /stage-command-results\.input\.json/);
  assert.match(source, /stage_artifact_mutation_attempted/);
  assert.match(
    source,
    /run_offline node tools\/simurgh-attestation\/stage4d\/verify-stage4d-pack\.mjs/
  );
  assert.match(
    source,
    /run_offline node tools\/simurgh-attestation\/stage4f\/verify-stage4f-frontier\.mjs/
  );
  assert.doesNotMatch(source, /git fetch/);
  assert.doesNotMatch(source, /npm audit/);
});
