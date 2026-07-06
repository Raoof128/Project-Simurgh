// SPDX-License-Identifier: AGPL-3.0-or-later
// PERMANENT guard against the recurring additive-code gremlin (broke CI on 4R and
// 4S): a test hardcodes some raw value as its "unknown code fails closed to 3"
// probe, then a LATER stage allocates that value as a real code and the probe
// silently starts asserting the wrong thing / breaking. This test scans every
// *.test.js in the repo and fails the instant any `stage4CodeForRawCode(N)`
// assertion that expects the fail-closed level 3 uses an N that IS a real code in
// RUN_LEVEL_BY_RAW. Fix: probe with UNKNOWN_RAW_PROBE (999), never a bare literal.
// Uses node:fs only — never shells `rg` (Linux CI lacks it; 4L lesson).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RUN_LEVEL_BY_RAW,
  UNKNOWN_RAW_PROBE,
  stage4CodeForRawCode,
} from "../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const TESTS_DIR = join(ROOT, "tests");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".test.js")) out.push(p);
  }
  return out;
}

// Matches `stage4CodeForRawCode(<digits>)` followed (within a short window) by an
// expectation of the fail-closed level 3: `, 3)` or `=== 3` or `, 3,`.
const PROBE_RE = /stage4CodeForRawCode\(\s*(\d+)\s*\)\s*(?:,\s*3\b|===\s*3\b)/g;

test("UNKNOWN_RAW_PROBE is a stable, unmapped, out-of-range fail-closed sentinel", () => {
  assert.equal(UNKNOWN_RAW_PROBE, 999);
  assert.equal(stage4CodeForRawCode(UNKNOWN_RAW_PROBE), 3);
  assert.equal(Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, UNKNOWN_RAW_PROBE), false);
  // Every allocated code is strictly below the sentinel, so growth upward can never
  // reach it before an intentional, reviewed change to this constant.
  for (const code of Object.keys(RUN_LEVEL_BY_RAW)) {
    assert.ok(
      Number(code) < UNKNOWN_RAW_PROBE,
      `allocated code ${code} must stay below the sentinel`
    );
  }
});

test("no test probes an ABOVE-FRONTIER literal as an unknown-fails-closed-to-3 value", () => {
  // The recurring bug is picking a value just ABOVE the current top block as the
  // "unknown" probe (100 before 4S). Such a value is unmapped today but is exactly
  // what the next stage allocates. The DANGER ZONE is (maxAllocated, sentinel): a
  // clearly out-of-band value >= UNKNOWN_RAW_PROBE (999, or a larger existing sentinel
  // like 9999) is safe; a value in the danger zone is fragile. Mapped codes (29 -> 3)
  // and deliberately-reserved below-frontier codes (39) are never flagged.
  const maxAllocated = Math.max(...Object.keys(RUN_LEVEL_BY_RAW).map(Number));
  const offenders = [];
  for (const file of walk(TESTS_DIR)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(PROBE_RE)) {
      const n = Number(m[1]);
      const unmapped = !Object.prototype.hasOwnProperty.call(RUN_LEVEL_BY_RAW, n);
      if (unmapped && n > maxAllocated && n < UNKNOWN_RAW_PROBE) {
        offenders.push(
          `${file.replace(ROOT + "/", "")}: stage4CodeForRawCode(${n}) probes danger-zone ${n} (max allocated ${maxAllocated}); use UNKNOWN_RAW_PROBE (999)`
        );
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Fragile above-frontier unknown-code probes found — the next stage will turn these into real codes.\n${offenders.join("\n")}`
  );
});
