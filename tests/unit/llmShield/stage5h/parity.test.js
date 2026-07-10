// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Python parity byte-agreement (skip-guarded if python3 absent) + rounding-edge check.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { aggregateMean } from "../../../../tools/simurgh-attestation/stage5h/node/recomputeKernelRunner.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");

function hasPython() {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("python parity corroborates the committed evidence", { skip: !hasPython() }, () => {
  const out = execFileSync(
    "python3",
    [join(ROOT, "tools/simurgh-attestation/stage5h/python/vsd_parity.py")],
    {
      encoding: "utf8",
    }
  );
  const parsed = JSON.parse(out);
  assert.equal(parsed.vsd_parity, "corroborated");
  assert.deepEqual(parsed.mismatches, []);
});

test("JS aggregateMean rounding-edge (half-up) — Python must agree by construction", () => {
  // 0.00005 → 0.0001 half-up at 4 decimals
  assert.equal(aggregateMean(["0.0000", "0.0001"], 4), "0.0001");
  assert.equal(aggregateMean(["0.9999", "0.9998"], 4), "0.9999"); // 0.99985 → 0.9999 (half-up = .9998+.9999)/2=.99985→.9999? floor((2*19997+2)/(4)) scaled
});
