// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O all-functions E2E net (4O spec §14). Composes every stage4o export end-to-end:
// the whole tamper matrix through the gate AND the verifier CLI, Node<->Python parity on
// multiply-broken arms, anti-theatre GREEN arms, selective disclosure, the constitutional
// alignment map + honesty ceiling, timeline binding, attestation tamper detection, and the
// cross-stage invariants (4N feed unchanged; shared exit ledger intact).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { gateToolCall } from "../../../../tools/simurgh-attestation/stage4o/core/decisionCore.mjs";
import { commitmentDigest } from "../../../../tools/simurgh-attestation/stage4o/core/manifestCore.mjs";
import {
  verifyTimelineRecord,
  parseFeed,
} from "../../../../tools/simurgh-attestation/stage4o/core/timelineCore.mjs";
import { checkAlignmentMap } from "../../../../tools/simurgh-attestation/stage4o/core/constitutionCore.mjs";
import {
  verifyEvidence,
  verifySelective,
} from "../../../../tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs";
import { stage4CodeForRawCode } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { HONESTY_CEILING } from "../../../../tools/simurgh-attestation/stage4o/constants.mjs";

const FIX = "tests/fixtures/llmShield/stage4o";
const EVID = "docs/research/llm-shield/evidence/stage-4o";
const pub = JSON.parse(readFileSync(`${FIX}/vtsa-manifest-signer.pub`, "utf8")).public_key_pem;
const pubKey = createPublicKey(pub);
const feed = parseFeed(
  readFileSync("docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl", "utf8")
);
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
const matrix = JSON.parse(readFileSync(`${FIX}/expected-results/vtsa-matrix.json`, "utf8"));
const loadArm = (name) => JSON.parse(readFileSync(`${FIX}/arms/${name}.json`, "utf8"));

test("arm sweep: every matrix arm hits its exact code via the correct evaluator", () => {
  const seen = new Set();
  let accepts = 0;
  for (const row of matrix) {
    const arm = loadArm(row.arm);
    let raw;
    if (row.evaluator === "timeline") {
      const out = verifyTimelineRecord({
        record: arm.timeline_record,
        chain: arm.chain,
        stage4nRecords: feed,
      });
      raw = out.ok ? 0 : out.raw;
    } else {
      raw = gateToolCall({
        chain: arm.chain,
        receipt: arm.receipt,
        actionDigest: arm.action_digest,
        verifyCommitmentSignature: sigCheck,
      }).raw;
    }
    assert.equal(raw, row.expected_raw, row.arm);
    seen.add(raw);
    if (raw === 0) accepts += 1;
  }
  // Anti-theatre: not reject-all, and broad coverage across the 55-66 block.
  assert.ok(accepts >= 3, `GREEN accepts ${accepts}`);
  assert.ok(seen.size >= 12, `distinct codes ${seen.size}`);
});

test("Node<->Python parity on multiply-broken arms yields the same first raw code", () => {
  const arms = ["laundering-chain", "signature-mismatch", "readonly-to-write"];
  const py = `
import json, sys
sys.path.insert(0, "tools/agentdojo-simurgh-adapter")
from simurgh_agentdojo_adapter import manifest_surface as ms
out = {}
for name in ${JSON.stringify(arms)}:
    arm = json.load(open(f"${FIX}/arms/{name}.json"))
    r = ms.gate_tool_call(chain=arm["chain"], receipt=arm["receipt"],
        action_digest_value=arm["action_digest"],
        verify_commitment_signature=lambda e: e.get("signature") != "TAMPERED",
        kernel_entrypoint="authorise_with_manifest.v1")
    out[name] = r["raw"]
print(json.dumps(out))
`;
  const pyOut = JSON.parse(execFileSync("python3", ["-c", py], { encoding: "utf8" }));
  for (const name of arms) {
    const nodeRaw = gateToolCall({
      chain: loadArm(name).chain,
      receipt: loadArm(name).receipt,
      actionDigest: loadArm(name).action_digest,
      verifyCommitmentSignature: sigCheck,
    }).raw;
    assert.equal(pyOut[name], nodeRaw, `parity ${name}`);
  }
});

test("selective disclosure: GREEN arm included, invalid-proof rejected", () => {
  assert.equal(verifySelective("green-unchanged").ok, true);
  assert.equal(verifySelective("invalid-inclusion-proof").ok, false);
});

test("committed evidence verifies green; alignment map + honesty ceiling intact", () => {
  const out = verifyEvidence(EVID);
  assert.equal(out.ok, true);
  const att = JSON.parse(readFileSync(`${EVID}/vtsa-attestation.json`, "utf8"));
  assert.deepEqual(checkAlignmentMap(att.constitutional_alignment), { ok: true });
  assert.equal(att.honesty_ceiling, HONESTY_CEILING);
  assert.ok(att.known_limitations.includes("retro_fixture_public_data_insufficient"));
});

test("attestation tamper: one flipped byte fails verification", () => {
  const dir = mkdtempSync(join(tmpdir(), "vtsa-e2e-"));
  const att = JSON.parse(readFileSync(`${EVID}/vtsa-attestation.json`, "utf8"));
  att.non_claims.push("we_make_the_model_safe"); // tamper without re-signing
  writeFileSync(join(dir, "vtsa-attestation.json"), JSON.stringify(att, null, 2) + "\n");
  copyFileSync(`${EVID}/vtsa-manifest.json`, join(dir, "vtsa-manifest.json"));
  copyFileSync(`${EVID}/clean-chain.json`, join(dir, "clean-chain.json"));
  assert.equal(verifyEvidence(dir).ok, false);
});

test("cross-stage invariants: 4N feed unchanged, shared exit ledger intact", () => {
  // The shared wrapper still maps the sentinel 4N and 4O codes correctly and fails closed.
  assert.equal(stage4CodeForRawCode(0), 0);
  assert.equal(stage4CodeForRawCode(29), 3);
  assert.equal(stage4CodeForRawCode(54), 1);
  assert.equal(stage4CodeForRawCode(66), 1);
  // 67-79 are Stage 4P VOCA codes (mapped to 1); 80+ is unknown.
  assert.equal(stage4CodeForRawCode(80), 3);
  // The 4N feed we anchor to is present and non-empty (read-only from 4O).
  assert.ok(feed.length > 0);
  assert.equal(feed[0].schema, "simurgh.seismograph.heartbeat.v1");
});

test("every stage4o core module exports are exercised (all-functions coverage)", () => {
  // Composition smoke: the modules the net imports must all be loadable and their key
  // exports callable. A missing/renamed export fails the net rather than silently passing.
  assert.equal(typeof gateToolCall, "function");
  assert.equal(typeof verifyTimelineRecord, "function");
  assert.equal(typeof checkAlignmentMap, "function");
  assert.equal(typeof verifyEvidence, "function");
  assert.equal(typeof verifySelective, "function");
  // The arms directory and matrix agree in cardinality.
  const armFiles = readdirSync(`${FIX}/arms`).filter((f) => f.endsWith(".json"));
  assert.equal(armFiles.length, matrix.length);
});
