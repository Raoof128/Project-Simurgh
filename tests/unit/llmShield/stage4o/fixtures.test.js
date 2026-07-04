// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { gateToolCall } from "../../../../tools/simurgh-attestation/stage4o/core/decisionCore.mjs";
import { commitmentDigest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  verifyTimelineRecord,
  parseFeed,
} from "../../../../tools/simurgh-attestation/stage4o/core/timelineCore.mjs";

const FIX = "tests/fixtures/llmShield/stage4o";
const pub = JSON.parse(readFileSync(`${FIX}/vtsa-manifest-signer.pub`, "utf8")).public_key_pem;
const pubKey = createPublicKey(pub);
const sigCheck = (env) => {
  if (typeof env.signature !== "string") return false;
  try {
    return edVerify(
      null,
      Buffer.from(commitmentDigest(env)),
      pubKey,
      Buffer.from(env.signature, "base64")
    );
  } catch {
    return false;
  }
};

const feed = parseFeed(
  readFileSync("docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl", "utf8")
);

test("every committed arm yields exactly its expected raw code and reason", () => {
  const matrix = JSON.parse(readFileSync(`${FIX}/expected-results/vtsa-matrix.json`, "utf8"));
  assert.ok(matrix.length >= 18, `expected >=18 arms, got ${matrix.length}`);
  const seen = new Set();
  let accepts = 0;
  for (const row of matrix) {
    const arm = JSON.parse(readFileSync(`${FIX}/arms/${row.arm}.json`, "utf8"));
    let raw;
    let reason;
    if (row.evaluator === "timeline") {
      const out = verifyTimelineRecord({
        record: arm.timeline_record,
        chain: arm.chain,
        stage4nRecords: feed,
      });
      raw = out.ok ? 0 : out.raw;
      reason = out.reason;
    } else {
      const out = gateToolCall({
        chain: arm.chain,
        receipt: arm.receipt,
        actionDigest: arm.action_digest,
        verifyCommitmentSignature: sigCheck,
      });
      raw = out.raw;
      reason = out.reason;
    }
    assert.equal(raw, row.expected_raw, `${row.arm}: raw`);
    if (row.expected_raw !== 0) assert.equal(reason, row.expected_reason, `${row.arm}: reason`);
    else accepts += 1;
    seen.add(raw);
  }
  // Anti-theatre: not reject-all (>=3 GREEN accepts) and broad coverage (>=10 distinct codes).
  assert.ok(accepts >= 3, `expected >=3 GREEN accepts, got ${accepts}`);
  assert.ok(seen.size >= 10, `expected >=10 distinct raw codes, got ${seen.size}`);
});

test("clean 3-epoch chain: genesis -> delta broadening -> state narrowing", () => {
  const { chain } = JSON.parse(readFileSync(`${FIX}/chains/clean-chain.json`, "utf8"));
  assert.equal(chain.length, 3);
  for (const env of chain) assert.equal(sigCheck(env), true);
});
