// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 30 — the attestation, which binds a MAP rather than a certificate.
//
// A SINGULAR `quorum_certificate` ROOT CANNOT REPRESENT THIS STAGE (§13, B9). Two checkpoints are
// compared, each with its own quorum status, and the four met/incomplete combinations are the
// stage's central evidence. A root binding one certificate would have to pick a view, and the
// picking would be invisible in the signed bytes.
//
// So the root binds a SET of compared envelope digests and a MAP from each digest to its quorum
// status — and the verifier refuses a map that is short by one, because a view whose quorum status
// was never stated is exactly the collapse the certificate root would have forced.
//
// THE VERIFIER REFUSES `--key`. Everything it needs is public. A verifier that accepted a private
// key would let somebody hand it the signing key and call the output a verification.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ATTESTATION_REFUSALS,
  REQUIRED_BINDINGS,
  attestationRoot,
  verifyAttestation,
} from "../../../../tools/simurgh-attestation/stage5s/node/attestation.mjs";
import { NON_CLAIM_IDS } from "../../../../tools/simurgh-attestation/stage5s/core/claimGate.mjs";
import { parseArgs } from "../../../../tools/simurgh-attestation/verify-stage5s-attestation.mjs";

const D = "docs/research/llm-shield/evidence/stage-5s/attestation";
const ENVELOPE = JSON.parse(readFileSync(`${D}/vwq-attestation-envelope.json`, "utf8"));
const PUB = readFileSync(`${D}/vwq-public-key.pem`, "utf8");

const clone = () => JSON.parse(JSON.stringify(ENVELOPE));
const reasons = (r) => r.refusals.map((x) => x.reason);

test("[5s-t30] the committed attestation verifies from public inputs", () => {
  const result = verifyAttestation(ENVELOPE, PUB);
  assert.equal(result.ok, true, JSON.stringify(result.refusals));
});

test("[5s-t30] the root binds a SET of compared digests and a MAP of quorum statuses", () => {
  const body = ENVELOPE.body;
  assert.ok(Array.isArray(body.compared_checkpoint_envelope_digests));
  assert.equal(body.compared_checkpoint_envelope_digests.length, 2, "one view is not a comparison");
  for (const digest of body.compared_checkpoint_envelope_digests) {
    assert.ok(digest in body.quorum_status_by_envelope_digest, `${digest} has no quorum status`);
  }
});

test("[5s-t30] a quorum map short by ONE is refused — the collapse a certificate would force", () => {
  const tampered = clone();
  const [first] = tampered.body.compared_checkpoint_envelope_digests;
  delete tampered.body.quorum_status_by_envelope_digest[first];
  tampered.attestation_root = attestationRoot(tampered.body);
  const result = verifyAttestation(tampered, PUB);
  assert.equal(result.ok, false);
  assert.ok(reasons(result).includes(ATTESTATION_REFUSALS.QUORUM_MAP_INCOMPLETE));
});

test("[5s-t30] a status for a digest that was NOT compared is refused too", () => {
  const tampered = clone();
  tampered.body.quorum_status_by_envelope_digest["never-compared"] = "witnessed_quorum";
  tampered.attestation_root = attestationRoot(tampered.body);
  const result = verifyAttestation(tampered, PUB);
  assert.equal(result.ok, false);
  assert.ok(reasons(result).includes(ATTESTATION_REFUSALS.QUORUM_MAP_INCOMPLETE));
});

test("[5s-t30] every required binding is present, and a missing one is refused", () => {
  for (const binding of REQUIRED_BINDINGS) {
    assert.ok(ENVELOPE.body[binding] !== undefined, `${binding} is absent from the committed body`);
  }
  const tampered = clone();
  delete tampered.body.witness_independence_status;
  tampered.attestation_root = attestationRoot(tampered.body);
  const result = verifyAttestation(tampered, PUB);
  assert.equal(result.ok, false);
  assert.ok(reasons(result).includes(ATTESTATION_REFUSALS.BINDING_ABSENT));
});

test("[5s-t30] the EXACT non-claim set is bound — a subset is refused", () => {
  // Otherwise a release could drop the inconvenient non-claims and still sign something that
  // verifies. The set is bound, not described.
  assert.deepEqual([...ENVELOPE.body.signed_non_claim_ids].sort(), [...NON_CLAIM_IDS].sort());
  const tampered = clone();
  tampered.body.signed_non_claim_ids = tampered.body.signed_non_claim_ids.filter(
    (id) => id !== "independence_unproven"
  );
  tampered.attestation_root = attestationRoot(tampered.body);
  const result = verifyAttestation(tampered, PUB);
  assert.equal(result.ok, false);
  assert.ok(reasons(result).includes(ATTESTATION_REFUSALS.NON_CLAIM_SET_MISMATCH));
});

test("[5s-t30] a tampered body is refused — the root does not cover it", () => {
  const tampered = clone();
  tampered.body.comparison_status = "no_conflict_in_committed_comparison_set";
  const result = verifyAttestation(tampered, PUB);
  assert.equal(result.ok, false);
  assert.ok(reasons(result).includes(ATTESTATION_REFUSALS.ROOT_MISMATCH));
});

test("[5s-t30] a stranger's key is refused, and so is a forged signature", () => {
  const stranger = execFileSync("openssl", ["genpkey", "-algorithm", "ed25519"], {
    encoding: "utf8",
  });
  const strangerPub = execFileSync("openssl", ["pkey", "-pubout"], {
    input: stranger,
    encoding: "utf8",
  });
  const wrongKey = verifyAttestation(ENVELOPE, strangerPub);
  assert.equal(wrongKey.ok, false);
  assert.ok(reasons(wrongKey).includes(ATTESTATION_REFUSALS.KEY_DIGEST_MISMATCH));

  const forged = clone();
  forged.signature = Buffer.from("not a signature").toString("base64");
  const bad = verifyAttestation(forged, PUB);
  assert.equal(bad.ok, false);
  assert.ok(reasons(bad).includes(ATTESTATION_REFUSALS.SIGNATURE_INVALID));
});

test("[5s-t30] the verifier REFUSES --key by name", () => {
  const refusal = parseArgs(["--bundle", "x.json", "--key", "/home/me/.simurgh/5s-ed25519.pem"]);
  assert.ok(refusal.error);
  assert.match(refusal.error, /--key is refused/);
  assert.match(refusal.error, /signing wearing a verifier's name/);
});

test("[5s-t30] the private key is NOT committed anywhere in the evidence", () => {
  // The standing rule, checked rather than remembered.
  const pub = readFileSync(`${D}/vwq-public-key.pem`, "utf8");
  assert.match(pub, /^-----BEGIN PUBLIC KEY-----/);
  assert.ok(!pub.includes("PRIVATE"), "a private key is sitting in the evidence directory");
  const fingerprint = readFileSync(`${D}/vwq-key-fingerprint.txt`, "utf8").trim();
  assert.match(fingerprint, /^sha256:[0-9a-f]{64}$/);
});

test("[5s-t30] the attestation records what the run actually found", () => {
  // Anti-vacuity: an attestation that bound placeholder values would verify perfectly and describe
  // nothing. These are the facts the positive control produced.
  const body = ENVELOPE.body;
  assert.equal(body.comparison_status, "equivocation_detected");
  assert.equal(body.equivocation_artifact_status, "present");
  assert.equal(body.witness_independence_status, "unproven");
  assert.equal(body.lane_c_capture_state, "captured");
  assert.match(body.lane_b_environment, /independence unproven/);
  assert.match(body.finding_ledger_digest, /^[0-9a-f]{64}$/);
});
