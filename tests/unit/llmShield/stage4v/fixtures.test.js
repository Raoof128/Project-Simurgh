import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { recordDigest, canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  buildLaneAFixtures,
  corpusDocument,
} from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-fixtures.mjs";
import { evaluateContestSafe, unsignedCounterCapsule } from "../../../../tools/simurgh-attestation/stage4v/core/counterCapsuleCore.mjs";
import { STAGE_VERIFIERS } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

test("every fixture reproduces its expected_raw and envelope digest", () => {
  const doc = corpusDocument();
  for (const c of doc.cases) {
    const capsule = c.capsule_override ?? doc.reference_capsule_bundle;
    const res = evaluateContestSafe(capsule, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
      ...(c.eval_opts ?? {}),
    });
    assert.equal(res.raw, c.expected_raw, c.name);
    assert.equal(recordDigest(res.envelope), c.expected_envelope_digest, c.name);
  }
});

test("tamper-matrix meta-assertions: only 152 has invalid sig, 153-160 validly resigned", () => {
  const doc = corpusDocument();
  const pub = crypto.createPublicKey(doc.respondent_pubkey_pem);
  const sigValid = (cc) => {
    try {
      return crypto.verify(
        null,
        Buffer.from(canonicalJson(unsignedCounterCapsule(cc))),
        pub,
        Buffer.from(cc.signature ?? "", "hex")
      );
    } catch {
      return false;
    }
  };
  for (const c of doc.cases) {
    if (c.expected_raw === 152) {
      assert.equal(sigValid(c.counter_capsule), false, "152 must have invalid sig");
    } else if (c.expected_raw >= 153 && c.expected_raw <= 160) {
      assert.equal(sigValid(c.counter_capsule), true, `${c.name} must be validly resigned`);
    }
  }
});

test("status-locality: DISPUTE_FAILED at X leaves other statuses byte-identical", () => {
  const doc = corpusDocument();
  const run = (name) => {
    const c = doc.cases.find((x) => x.name === name);
    return evaluateContestSafe(doc.reference_capsule_bundle, c.counter_capsule, {
      capsulePubKeyPem: doc.capsule_pubkey_pem,
      respondentPubKeyPem: doc.respondent_pubkey_pem,
      stageVerifiers: STAGE_VERIFIERS,
    }).envelope.result.sections;
  };
  const withX = run("locality-with-failed-section").filter(
    (s) => s.key !== "gpai_art55/serious_incident_response"
  );
  const without = run("locality-without-failed-section");
  assert.deepEqual(withX, without);
});

test("corpus is non-empty and covers 151-160 + 134", () => {
  const fixtures = buildLaneAFixtures();
  const codes = new Set(fixtures.map((f) => f.expected_raw));
  for (const raw of [134, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160])
    assert.ok(codes.has(raw), `missing fixture for raw ${raw}`);
});
