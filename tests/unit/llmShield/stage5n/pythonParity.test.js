// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — Node↔Python deterministic-core parity. Runs the Python module and asserts byte-identical
// seed / x0 / terminal / checkpoints vs the Node core. Skips if python3 is unavailable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { deriveSeed, runChain } from "../../../../tools/simurgh-attestation/stage5n/core/chain.mjs";

const PY = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tools/simurgh-attestation/stage5n/python/vtc_delay_parity.py"
);

function havePython() {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("Python reproduces the Node seed + chain byte-for-byte", { skip: !havePython() }, () => {
  const seed = deriveSeed({
    run_id: "r1",
    D_in: "a".repeat(64),
    start_token_digest: "b".repeat(64),
    delay_policy_digest: "c".repeat(64),
  });
  const chain = runChain(seed, 10, 5);
  const node = { seed, x0: chain.x0, terminal: chain.terminal_value, cps: chain.checkpoints };

  const out = execFileSync("python3", [PY], { encoding: "utf8" });
  const py = JSON.parse(out);

  assert.equal(py.seed, node.seed, "seed parity");
  assert.equal(py.x0, node.x0, "x0 parity");
  assert.equal(py.terminal, node.terminal, "terminal parity");
  assert.deepEqual(py.cps, node.cps, "checkpoint ladder parity");
});
