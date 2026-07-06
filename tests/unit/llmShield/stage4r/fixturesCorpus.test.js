// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateCeremony } from "../../../../tools/simurgh-attestation/stage4r/core/pcccCore.mjs";
import { reconstructInput } from "../../../../tools/simurgh-attestation/stage4r/core/ceremonyBuilder.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4r/test-keys");
const CORPUS = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-4r/lane-a/corpus.json"), "utf8")
);
const pubKeys = {
  a: crypto.createPublicKey(
    crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-alpha.pem")))
  ),
  b: crypto.createPublicKey(
    crypto.createPrivateKey(readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_operator-beta.pem")))
  ),
};

function verdict(entry) {
  return evaluateCeremony(
    reconstructInput(
      {
        transcript: entry.transcript,
        sealedPacket: entry.sealedPacket,
        operatorPublicKeys: pubKeys,
      },
      entry.overrides
    )
  );
}

test("every Lane A corpus case evaluates to its committed verdict", () => {
  for (const c of CORPUS.cases) {
    const got = verdict(c);
    const want = c.expect.green
      ? { raw: 0, green: true }
      : { raw: c.expect.raw, reason: c.expect.reason, green: false };
    assert.deepEqual(got, want, `case ${c.name}`);
  }
});

test("corpus covers every raw code and subreason (full tamper matrix)", () => {
  const seen = new Set(
    CORPUS.cases.map((c) => (c.expect.green ? "green" : `${c.expect.raw}:${c.expect.reason}`))
  );
  const required = [
    "green",
    "90:pccc_phase_order_invalid",
    "90:pccc_token_commitment_missing",
    "90:pccc_token_commitment_opening_invalid",
    "90:slot_cardinality_mismatch",
    "90:window_match_census_mismatch",
    "91:operator_identity_signature_invalid",
    "92:match_claim_conflict",
    "93:dleq_mask_proof_invalid",
    "93:dleq_z_proof_invalid",
    "93:token_recompute_mismatch",
    "94:small_order_or_all_zero_fail_closed",
    "95:cross_epoch_replay_detected",
    "96:mask_reuse_detected",
    "96:ephemeral_public_digest_reuse_detected",
    "97:disclosure_budget_exceeded",
    "98:vfr_export_gate_failed",
    "99:public_herd_token_violation",
  ];
  for (const r of required) assert.ok(seen.has(r), `missing coverage: ${r}`);
  const greenCount = CORPUS.cases.filter((c) => c.expect.green).length;
  assert.ok(greenCount >= 2, "need >=2 GREEN arms (match + non-match)");
});

test("no public record in the corpus carries sealed material (§5.2)", () => {
  const sealed = ["mask_point", "token", "token_nonce", "z", "dleq"];
  for (const c of CORPUS.cases) {
    const json = JSON.stringify(c.publicRecord);
    for (const key of sealed) {
      assert.ok(!json.includes(`"${key}"`), `${c.name} public record leaks ${key}`);
    }
  }
});
