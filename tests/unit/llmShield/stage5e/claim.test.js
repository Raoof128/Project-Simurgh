// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — claim integrity + signed review + provenance (plan Task 7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  overclaimScreen,
  reviewRecordValid,
  checkClaims,
  checkProvenance,
} from "../../../../tools/simurgh-attestation/stage5e/core/claim.mjs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const reviewerPubKeyPem = publicKey.export({ type: "spki", format: "pem" });

function signedReview(overrides = {}) {
  const record = {
    reviewer_key_id: "reviewer-1",
    criteria_version: "v1",
    base_digest: "sha256:aa",
    variant_digest: "sha256:bb",
    decision: "equivalent",
    ...overrides,
  };
  const signature = edSign(null, Buffer.from(canonicalJson(record), "utf8"), privateKey).toString(
    "base64"
  );
  return { ...record, review_signature: signature };
}

test("overclaimScreen: defeat phrases fire 264; bare accurate verbs stay legal", () => {
  assert.equal(overclaimScreen("the detector defeated our test"), 264);
  assert.equal(overclaimScreen("this is completely bypassed"), 264);
  assert.equal(overclaimScreen("the evasion bypassed the detector at θ=0.5000"), null);
  assert.equal(overclaimScreen("N variants slip at the reference threshold"), null);
  assert.equal(overclaimScreen(null), null);
});

test("reviewRecordValid: signed 'equivalent' record verifies; tamper/unsigned fails", () => {
  assert.ok(reviewRecordValid(signedReview(), reviewerPubKeyPem));
  assert.ok(!reviewRecordValid(signedReview({ decision: "not_equivalent" }), reviewerPubKeyPem));
  const tampered = signedReview();
  tampered.base_digest = "sha256:zz"; // content changed after signing
  assert.ok(!reviewRecordValid(tampered, reviewerPubKeyPem));
  assert.ok(!reviewRecordValid({ decision: "equivalent" }, reviewerPubKeyPem)); // no signature
});

function bundle(evasion, extra = {}) {
  return {
    analyst_note: "N variants slip at reference θ",
    score_table: { digest: "sha256:st" },
    capture_provenance: { score_table_digest: "sha256:st", capture_log_digest: "sha256:log" },
    evasions: [evasion],
    ...extra,
  };
}

test("checkClaims: a reviewed inversion needs a real inversion AND a valid signed record", () => {
  const rec = signedReview();
  const ok = bundle(
    {
      base_id: "b1",
      score_inversion: true,
      reviewed_equivalent_inversion: true,
      review_record_digest: "r1",
    },
    { review_records: [{ digest: "r1", record: rec }] }
  );
  assert.equal(checkClaims(ok, { reviewerPubKeyPem }), null);

  // reviewed=true but score does NOT invert -> 264 (unbacked strong claim)
  const noInv = bundle(
    {
      base_id: "b1",
      score_inversion: false,
      reviewed_equivalent_inversion: true,
      review_record_digest: "r1",
    },
    { review_records: [{ digest: "r1", record: rec }] }
  );
  assert.equal(checkClaims(noInv, { reviewerPubKeyPem }), 264);

  // reviewed=true, inversion true, but NO valid record -> 264 (a boolean is not enough)
  const noRec = bundle({
    base_id: "b1",
    score_inversion: true,
    reviewed_equivalent_inversion: true,
    review_record_digest: "missing",
  });
  assert.equal(checkClaims(noRec, { reviewerPubKeyPem }), 264);
});

test("checkClaims: 264 on a forbidden structured claim; denylist note", () => {
  const b = bundle(
    { base_id: "b1", score_inversion: true, reviewed_equivalent_inversion: false },
    { structured_claims: ["detector_defeated"] }
  );
  assert.equal(checkClaims(b, { reviewerPubKeyPem }), 264);
  const bNote = bundle({ base_id: "b1", score_inversion: true });
  bNote.analyst_note = "the detector is unsafe";
  assert.equal(checkClaims(bNote, { reviewerPubKeyPem }), 264);
});

test("checkProvenance: 265 on digest mismatch or unknown attester evasion", () => {
  const b = bundle({ base_id: "b1", generated_text_digest: "sha256:g1", score_inversion: true });
  assert.equal(checkProvenance(b), null);
  const bad = bundle({ base_id: "b1", generated_text_digest: "sha256:g1" });
  bad.capture_provenance.score_table_digest = "sha256:other";
  assert.equal(checkProvenance(bad), 265);
  const badAtt = bundle({ base_id: "b1", generated_text_digest: "sha256:g1" });
  badAtt.attester_provenance = { generated_text_digest: "sha256:unknown" };
  assert.equal(checkProvenance(badAtt), 265);
});
