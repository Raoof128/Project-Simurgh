// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U JS<->Python parity tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildCorpus } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-corpus.mjs";
import { recomputeAsr } from "../../../../tools/simurgh-attestation/stage4u/core/findingLedger.mjs";

test("python parity: classify + exact-rational ASR match JS on the whole corpus", () => {
  const { bundle } = buildCorpus({ write: false });
  const js = recomputeAsr(bundle.finding_records).attack_success_rate;
  const out = JSON.parse(
    execFileSync("python3", ["tools/simurgh-attestation/stage4u/python/vrta_parity.py"], {
      encoding: "utf8",
    })
  );
  assert.deepEqual(out.attack_success_rate, js);
  assert.equal(out.per_fixture.length, 58);
  for (const p of out.per_fixture) {
    const f = bundle.finding_records.find((x) => x.attack_id === p.attack_id);
    assert.equal(p.outcome_class, f.outcome_class);
  }
});
