// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  implicationReport,
  validateAcknowledgement,
  validateContest,
} from "../../../../tools/simurgh-attestation/stage4m/core/respondentCore.mjs";
import {
  nodeVerifyEd25519,
  signContest,
  spkiB64FromPublicKey,
} from "../../../../tools/simurgh-attestation/stage4m/node/signing-node.mjs";

const D = (n) => `sha256:${String(n).repeat(64)}`;
const rescore = {
  schema: "simurgh.vxd.retro_rescore.v1",
  window: "2026-05",
  merge_event_digest: D("9"),
  breached_before: [],
  breached_after: [D("d")],
  newly_revealed: [D("d")],
  monotonicity_ok: true,
  findings: [],
};
const rd = recordDigest(rescore);
const recordsByDigest = new Map([[rd, rescore]]);
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const respondentKeyB64 = spkiB64FromPublicKey(publicKey);

const unsigned = () => ({
  schema: "simurgh.vxd.respondent_contest.v1",
  contested_records: [{ window: "2026-05", record_digest: rd }],
  contest_type: "arithmetic_error_alleged",
  respondent_public_key: `ed25519:${respondentKeyB64}`,
  statement_digest: D("7"),
});

test("implication report: referenced records + honest not_referenced_in_bundle", () => {
  const rep = implicationReport({ records: [rescore], respondentClusters: [D("d"), D("f")] });
  assert.equal(rep.referenced.length, 1);
  assert.deepEqual(rep.referenced[0], {
    record_digest: rd,
    schema: rescore.schema,
    window: "2026-05",
    matched_cluster: D("d"),
  });
  assert.deepEqual(rep.not_referenced_in_bundle, [D("f")]);
});

test("V10: signed contest verifies end-to-end", async () => {
  const contest = signContest(unsigned(), privateKey);
  const r = await validateContest({ contest, recordsByDigest, verifySig: nodeVerifyEd25519 });
  assert.equal(r.ok, true);
});

test("V11: forged signature -> 46 signature_invalid", async () => {
  const contest = signContest(unsigned(), privateKey);
  contest.statement_digest = D("8"); // mutate AFTER signing
  const r = await validateContest({ contest, recordsByDigest, verifySig: nodeVerifyEd25519 });
  assert.deepEqual([r.ok, r.rawCode, r.reason], [false, 46, "signature_invalid"]);
});

test("V12: dangling record reference -> 46; bad type -> 46; schema -> 46", async () => {
  const c1 = signContest(
    { ...unsigned(), contested_records: [{ window: "2026-05", record_digest: D("5") }] },
    privateKey
  );
  assert.equal(
    (await validateContest({ contest: c1, recordsByDigest, verifySig: nodeVerifyEd25519 })).reason,
    "dangling_record_reference"
  );
  const c2 = signContest({ ...unsigned(), contest_type: "cosmic_injustice" }, privateKey);
  assert.equal(
    (await validateContest({ contest: c2, recordsByDigest, verifySig: nodeVerifyEd25519 })).reason,
    "unknown_contest_type"
  );
  const c3 = signContest({ ...unsigned(), extra: 1 }, privateKey);
  assert.equal(
    (await validateContest({ contest: c3, recordsByDigest, verifySig: nodeVerifyEd25519 })).reason,
    "schema_invalid"
  );
});

test("V17: acknowledgement — valid chains, forged/dangling -> 46", async () => {
  const contest = signContest(unsigned(), privateKey);
  const contestDigest = recordDigest(contest);
  const provider = generateKeyPairSync("ed25519");
  const providerB64 = spkiB64FromPublicKey(provider.publicKey);
  const ackUnsigned = {
    schema: "simurgh.vxd.contest_acknowledgement.v1",
    contest_digest: contestDigest,
    statement_digest: D("6"),
    respondent_public_key: `ed25519:${providerB64}`,
  };
  // acknowledgements sign with the PROVIDER key over the same contest domain
  const ack = signContest(ackUnsigned, provider.privateKey);
  const ok = await validateAcknowledgement({
    ack,
    contestDigests: new Set([contestDigest]),
    verifySig: nodeVerifyEd25519,
    providerPublicKeySpkiB64: providerB64,
  });
  assert.equal(ok.ok, true);
  const dangling = await validateAcknowledgement({
    ack: signContest({ ...ackUnsigned, contest_digest: D("4") }, provider.privateKey),
    contestDigests: new Set([contestDigest]),
    verifySig: nodeVerifyEd25519,
    providerPublicKeySpkiB64: providerB64,
  });
  assert.deepEqual(
    [dangling.ok, dangling.rawCode, dangling.reason],
    [false, 46, "dangling_contest_digest"]
  );
});
