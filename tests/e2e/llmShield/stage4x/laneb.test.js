// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR Lane B e2e (plan Task 9) — blind two-process recompute, verify-only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage4x/laneb/run-laneb-recompute-ceremony.mjs";

const PARENT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tools/simurgh-attestation/stage4x/laneb/run-laneb-recompute-ceremony.mjs"
);

test("blind child recompute matches the committed ledger byte-for-byte", () => {
  const c = runCeremony();
  assert.equal(c.match, true);
  assert.equal(c.parent_computed_catch_rate, false);
  assert.equal(c.child_received_committed_ledger_path, false);
  assert.equal(c.child_received_operator_env, false);
});

test("parent is dumb: imports NO gate/ledger module (process-isolated, not implementation-independent)", () => {
  const src = readFileSync(PARENT, "utf8");
  for (const forbidden of [
    "leakageGate",
    "gateV2",
    "residueLedger",
    "computeLedgerFromLiveGate",
    "checkLeakage",
  ])
    assert.ok(!src.includes(forbidden), `parent must not import ${forbidden}`);
});
