// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runStage3vSelfProof } from "../../../../tests/e2e/llm_shield_stage3v_tamper_runner.mjs";

test("self-proof: every tamper case rejected, counters all zero", () => {
  const r = runStage3vSelfProof();
  assert.equal(r.all_passed, true);
  for (const c of r.cases) assert.equal(c.rejected, true, `${c.name} not rejected`);
  for (const v of Object.values(r.counters)) assert.equal(v, 0);
  const names = r.cases.map((c) => c.name);
  for (const n of [
    "external_verdict_flipped",
    "gateway_hash_edited",
    "manifest_edited",
    "metrics_edited",
    "wrong_public_key",
    "raw_output_injected",
    "file_removed",
    "adapter_supplied_hash",
  ])
    assert.ok(names.includes(n), `missing tamper case ${n}`);
});
