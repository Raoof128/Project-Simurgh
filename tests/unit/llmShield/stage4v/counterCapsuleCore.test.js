import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  recordDigest,
  canonicalJson,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { capsuleAttestationDigest } from "../../../../tools/simurgh-attestation/stage4t/core/capsuleCore.mjs";
import {
  buildGreenBundle,
  STAGE_VERIFIERS,
  EPOCH,
} from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import {
  buildCounterCapsule,
  resignCounterCapsule,
  evaluateContest,
  evaluateContestSafe,
} from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import { buildRespondentCensus } from "../../../../tools/simurgh-attestation/stage4v/core/contestCensus.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KEYDIR = join(HERE, "../../../../tests/fixtures/llmShield/stage4v/test-keys");
const readKey = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
const readPub = (n) => readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${n}.pub.pem`), "utf8");

const green = buildGreenBundle();
const kernel2 = {
  kind: "kernel_decision_records",
  epoch: EPOCH,
  decisions: [{ decision: "blocked" }, { decision: "blocked" }],
};
const arts = [kernel2];
const census = buildRespondentCensus({
  epoch: EPOCH,
  items: arts.map((a) => ({ kind: a.kind, digest: recordDigest(a), epoch: EPOCH })),
});
const baseContests = () => [
  {
    regime: "gpai_art55",
    section_id: "root_cause_analysis",
    verb: "dispute_as_judgment",
    judgment_text_digest: "sha256:" + "0".repeat(64),
  },
  {
    regime: "gpai_art55",
    section_id: "serious_incident_response",
    verb: "dispute_by_recomputation",
    claimed_value: 2,
    recompute_kind: "kernel_block_record",
    evidence_digest: recordDigest(kernel2),
  },
];
const mk = () =>
  buildCounterCapsule({
    capsuleBundle: green.bundle,
    capsulePubKeyPem: green.pubKeyPem,
    contests: baseContests(),
    respondentRole: "deployer",
    respondentCensus: census,
    respondentArtifacts: arts,
    privKeyPem: readKey("vdp-respondent"),
    pubKeyPem: readPub("vdp-respondent"),
  });
const opts = () => ({
  capsulePubKeyPem: green.pubKeyPem,
  respondentPubKeyPem: readPub("vdp-respondent"),
  stageVerifiers: STAGE_VERIFIERS,
});
const resign = (cc) => resignCounterCapsule(cc, readKey("vdp-respondent"));

test("green contest -> raw 0, reverify 0, map present, filed not_supplied", () => {
  const { raw, envelope } = evaluateContest(green.bundle, mk(), opts());
  assert.equal(raw, 0);
  assert.equal(envelope.capsule_reverify_result, 0);
  assert.equal(envelope.filed_at_beat_status, "not_supplied");
  assert.ok(envelope.result.sections);
});

test("broken respondent signature -> 152", () => {
  const cc = mk();
  cc.signature = "00".repeat(32);
  assert.equal(evaluateContest(green.bundle, cc, opts()).raw, 152);
});

test("unknown respondent_role -> 151", () => {
  const cc = mk();
  cc.respondent_role = "martian";
  resign(cc);
  assert.equal(evaluateContest(green.bundle, cc, opts()).raw, 151);
});

test("unknown structural top-level key -> 151; top-level raw-content key -> 159", () => {
  const s = mk();
  s.smuggled = 1;
  resign(s);
  assert.equal(evaluateContest(green.bundle, s, opts()).raw, 151);
  const t = mk();
  t.transcript = "hidden defence text";
  resign(t);
  assert.equal(evaluateContest(green.bundle, t, opts()).raw, 159);
});

test("unknown structural contest key -> 151; raw-content contest key -> 159", () => {
  const s = mk();
  s.contests[1].foo = 1;
  resign(s);
  assert.equal(evaluateContest(green.bundle, s, opts()).raw, 151);
  const t = mk();
  t.contests[0].judgment_text = "raw prose";
  resign(t);
  assert.equal(evaluateContest(green.bundle, t, opts()).raw, 159);
});

test("dispute missing claimed_value -> 151", () => {
  const cc = mk();
  delete cc.contests[1].claimed_value;
  resign(cc);
  assert.equal(evaluateContest(green.bundle, cc, opts()).raw, 151);
});

test("expectedConflictMap mismatch -> 160", () => {
  const cc = mk();
  const good = evaluateContest(green.bundle, cc, opts()).envelope.result;
  const tampered = JSON.parse(JSON.stringify(good));
  tampered.sections[0].status = "AGREED";
  assert.equal(
    evaluateContest(green.bundle, cc, { ...opts(), expectedConflictMap: tampered }).raw,
    160
  );
});

test("subpoena: tampered capsule inner signature -> raw 134, refused", () => {
  const tampered = JSON.parse(JSON.stringify(green.bundle));
  tampered.content.signature = "00".repeat(32);
  tampered.attestation_digest = capsuleAttestationDigest(tampered);
  const res = evaluateContest(tampered, mk(), opts());
  assert.equal(res.raw, 134);
  assert.equal(res.envelope.result.refused, true);
  assert.equal(res.envelope.capsule_reverify_result, 134);
});

test("161 fail-closed on an internal throw after pre-verify (public tier)", () => {
  // A non-serialisable artifact throws in respondentArtifactsIndex -> recordDigest
  // -> canonicalJson, inside evaluateContest at the census step. It is reached only
  // in public tier: the signed-tier signatureCheck canonicalJsons the body first and
  // catches the throw as 152. Public tier skips 152, so the throw lands in the census
  // step (after a successful pre-verify) and evaluateContestSafe fails closed to 161.
  const poisoned = mk();
  poisoned.respondent_evidence_artifacts.push({ kind: "x", bad: 10n }); // BigInt -> JSON throws
  const { raw } = evaluateContestSafe(green.bundle, poisoned, { ...opts(), publicTier: true });
  assert.equal(raw, 161);
});
