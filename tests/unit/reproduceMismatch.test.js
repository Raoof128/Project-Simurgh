// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const cases = [
  [
    "4k",
    'if [ "$UNDER_EXIT" -ne 0 ]; then',
    "UNDER_EXIT=1; UNDER_REPORT=unused; report_raw(){ echo 0; };",
  ],
  ["4l", '  if [ "$OBSERVED" != "$EXPECTED" ]; then', "OBSERVED=0; EXPECTED=41; b=negative;"],
  ["4m", '  if [ "$OBSERVED" != "$EXPECTED" ]; then', "OBSERVED=0; EXPECTED=44; b=negative;"],
  ["4m", 'if [ "$OBS" != "22" ]; then', "OBS=0;"],
];
for (const [stage, start, setup] of cases)
  test(`Stage ${stage} refuses unexpected success: ${start}`, () => {
    const text = readFileSync(`scripts/reproduce-llm-shield-stage${stage}.sh`, "utf8");
    const begin = text.indexOf(start);
    assert.ok(begin >= 0);
    const end = text.indexOf("fi", begin) + 2;
    const branch = text.slice(begin, end);
    const script = `set -euo pipefail\nexit_via_wrapper(){ node -e 'import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m=>process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))' "$1"; }\n${setup}\n${branch}\necho ALL_GREEN\n`;
    const r = spawnSync("bash", ["-c", script], { encoding: "utf8" });
    assert.notEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
    assert.doesNotMatch(r.stdout, /ALL_GREEN/);
  });
