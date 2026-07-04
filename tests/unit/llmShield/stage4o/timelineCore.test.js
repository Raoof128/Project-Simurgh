// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTimelineRecord,
  verifyTimelineRecord,
  parseFeed,
} from "../../../../tools/simurgh-attestation/stage4o/core/timelineCore.mjs";

const feed = parseFeed(
  readFileSync("docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl", "utf8")
);
const chain = JSON.parse(
  readFileSync("tests/fixtures/llmShield/stage4o/chains/clean-chain.json", "utf8")
).chain;

test("valid timeline record binds a chain head to a real 4N position", () => {
  const rec = buildTimelineRecord({ chainHeadEnvelope: chain[0], stage4nRecord: feed[0] });
  assert.equal(rec.toolset_root, chain[0].manifest.toolset_digest);
  assert.equal(rec.manifest_epoch, 0);
  assert.deepEqual(verifyTimelineRecord({ record: rec, chain, stage4nRecords: feed }), {
    ok: true,
  });
});

test("root mismatch => 66/timeline_root_mismatch", () => {
  const rec = buildTimelineRecord({ chainHeadEnvelope: chain[0], stage4nRecord: feed[0] });
  const bad = { ...rec, toolset_root: "sha256:" + "e".repeat(64) };
  assert.deepEqual(verifyTimelineRecord({ record: bad, chain, stage4nRecords: feed }), {
    ok: false,
    raw: 66,
    reason: "timeline_root_mismatch",
  });
});

test("absent 4N position => 66/chain_position_absent", () => {
  const rec = buildTimelineRecord({ chainHeadEnvelope: chain[0], stage4nRecord: feed[0] });
  const bad = { ...rec, stage4n_chain_position_digest: "sha256:" + "f".repeat(64) };
  assert.deepEqual(verifyTimelineRecord({ record: bad, chain, stage4nRecords: feed }), {
    ok: false,
    raw: 66,
    reason: "chain_position_absent",
  });
});
