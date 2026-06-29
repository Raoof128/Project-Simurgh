// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import {
  deriveCanonicalSeed,
  deriveSchedule,
  scheduleDigest,
} from "../../../../tools/simurgh-attestation/stage4g/schedule.mjs";
import {
  buildAbortRecord,
  buildCampaignRecord,
  buildEvidencePackRecord,
  recordHash,
  signRecordEnvelope,
  verifyRecordEnvelope,
} from "../../../../tools/simurgh-attestation/stage4g/records.mjs";

const base = {
  target_commit: "0123456789abcdef0123456789abcdef01234567",
  library_hash: "sha256:" + "a".repeat(64),
  policy_hash: "sha256:" + "b".repeat(64),
  driver_hash: "sha256:" + "c".repeat(64),
  budget: { queries_total: 4, per_class: { I: 1, II: 1, III: 1, IV: 1 } },
};

test("canonical seed and schedule are deterministic per build configuration", () => {
  const seed = deriveCanonicalSeed(base);
  assert.match(seed, /^sha256:[a-f0-9]{64}$/);
  const first = deriveSchedule({ ...base, seed });
  const second = deriveSchedule({ ...base, seed });
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map((row) => row.id),
    ["a0001", "a0002", "a0003", "a0004"]
  );
  assert.deepEqual(
    first.map((row) => row.target_class),
    ["I", "II", "III", "IV"]
  );
  assert.match(scheduleDigest(first), /^sha256:[a-f0-9]{64}$/);
});

test("campaign records, evidence-pack records, and abort records are hashable and signable", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const record = buildCampaignRecord({
    attempt_id: "a0003",
    target_class: "III",
    resolved_class: "III",
    verdict: "out_of_scope",
    reason_codes: ["unmediated_action"],
    sealed_inputs_hash: "sha256:" + "d".repeat(64),
  });
  assert.equal(record.record_type, "CR");
  assert.match(recordHash(record), /^sha256:[a-f0-9]{64}$/);
  const envelope = signRecordEnvelope(record, privateKey);
  assert.equal(verifyRecordEnvelope(envelope, publicKey).ok, true);
  assert.equal(
    verifyRecordEnvelope({ ...envelope, payload: { ...record, verdict: "caught" } }, publicKey).ok,
    false
  );

  const abort = buildAbortRecord({
    attempt_id: "a0004",
    target_class: "IV",
    reason_codes: ["environment_setup_error"],
    sealed_inputs_hash: "sha256:" + "e".repeat(64),
  });
  assert.equal(abort.record_type, "abort");
  assert.equal(abort.verdict, "aborted");

  const ep = buildEvidencePackRecord({
    attempt_id: "a0001",
    target_class: "I",
    resolved_class: "I",
    verdict: "caught",
    reason_codes: ["decision_replay_blocked"],
    sealed_inputs_hash: "sha256:" + "f".repeat(64),
    evidence_pack_hash: "sha256:" + "1".repeat(64),
    evidence_pack_sig_hash: "sha256:" + "2".repeat(64),
  });
  assert.equal(ep.record_type, "EP");
  assert.equal(ep.target_class, "I");
});
