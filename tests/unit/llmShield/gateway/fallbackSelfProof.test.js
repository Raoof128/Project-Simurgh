// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runFallbackSelfProof } from "../../../../src/llmShield/gateway/fallbackSelfProof.js";

test("self-proof: every detector fires and zero bypass successes", async () => {
  const sp = await runFallbackSelfProof();
  assert.ok(sp.fixtures.every((f) => f.passed), JSON.stringify(sp.fixtures.filter((f) => !f.passed)));
  assert.equal(sp.summary.all_passed, true);
  assert.equal(sp.summary.fallback_bypass_successes, 0);
  const ids = sp.fixtures.map((f) => f.fixture_id);
  for (const id of [
    "availability-failure-swap",
    "refusal-fallback-enabled",
    "refusal-fallback-disabled",
    "provider-refusal-unsafe-local-block",
    "availability-failure-unsafe-local-block",
    "simurgh-block-never-swaps",
    "trust-never-improves",
    "cap-one-hop",
    "streaming-refusal-partial-output-discarded",
  ])
    assert.ok(ids.includes(id), `missing ${id}`);
});
