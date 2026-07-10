import test from "node:test";
import assert from "node:assert/strict";
import {
  validBundle,
  resign,
  issueChallenge,
  identityDigest,
  captureDigest,
  fixtureIdentities,
  fixtureArtifacts,
} from "./_validBundle.mjs";
import { verifyContent } from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5g/constants.mjs";

test("issueChallenge produces a receipt whose verifier signature verifies", () => {
  const { verifier } = fixtureIdentities();
  const { corpus, panelPlan, detectorSnapshot } = fixtureArtifacts();
  const r = issueChallenge({ corpus, panelPlan, detectorSnapshot, verifierIdentity: verifier });
  assert.equal(
    verifyContent(verifier, DOMAIN.challenge_receipt, r.content, r.verifier_signature),
    true
  );
});

test("a challenge_bound validBundle has all three signatures verifying", () => {
  const b = validBundle({ rung: "challenge_bound" });
  assert.equal(
    verifyContent(
      b.verifier_identity,
      DOMAIN.challenge_receipt,
      b.challenge_receipt.content,
      b.challenge_receipt.verifier_signature
    ),
    true
  );
  assert.equal(
    verifyContent(
      b.producer_identity,
      DOMAIN.producer_transcript,
      b.producer_transcript.content,
      b.producer_transcript.producer_signature
    ),
    true
  );
  const { attestation_signature, ...content } = b;
  assert.equal(
    verifyContent(b.verifier_identity, DOMAIN.foreign_capture, content, attestation_signature),
    true
  );
});

test("capture_digest binds the whole capture object", () => {
  const b = validBundle({ rung: "challenge_bound" });
  assert.equal(b.producer_transcript.content.capture_digest, captureDigest(b.capture));
});

test("producer and verifier identities have distinct keys", () => {
  const b = validBundle({ rung: "challenge_bound" });
  assert.notEqual(b.producer_identity.key_fingerprint, b.verifier_identity.key_fingerprint);
});

test("a distinct_key_only bundle carries no challenge receipt", () => {
  const b = validBundle({ rung: "distinct_key_only" });
  assert.equal(b.challenge_receipt, undefined);
  assert.equal(b.producer_transcript.content.challenge_record_digest, undefined);
});

test("resign restores all signatures after a capture mutation", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.capture.cells[0].detector_input_digest = "sha256:" + "9".repeat(64);
  const fixed = resign(b);
  assert.equal(fixed.producer_transcript.content.capture_digest, captureDigest(fixed.capture));
  const { attestation_signature, ...content } = fixed;
  assert.equal(
    verifyContent(fixed.verifier_identity, DOMAIN.foreign_capture, content, attestation_signature),
    true
  );
});

test("a mutated cell WITHOUT resign breaks capture_digest", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.capture.cells[0].detector_input_digest = "sha256:" + "9".repeat(64);
  assert.notEqual(b.producer_transcript.content.capture_digest, captureDigest(b.capture));
});
