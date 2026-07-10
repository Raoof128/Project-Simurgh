// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC deterministic synthetic bundle builder (Lane A). FIXED nonce, no timestamps → byte
// stable. This is the honest SYNTHETIC structural demo (fixture keys); the REAL foreign capture is Lane C.
// Kept in production node/ (never imported from tests) so build-vfc-evidence has no test dependency.
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  domainDigest,
  artifactDigest,
  identityDigest,
} from "../core/digests.mjs";
import { fingerprint, signContent } from "../core/signatures.mjs";
import { DOMAIN, VFC_SCHEMAS } from "../constants.mjs";

const DEFAULT_KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../tests/fixtures/llmShield/stage5g/test-keys"
);

export function buildSyntheticBundle(keysDir = DEFAULT_KEYS) {
  const priv = (n) => readFileSync(join(keysDir, `INSECURE_FIXTURE_ONLY_${n}.pem`), "utf8");
  const pubPem = (p) =>
    createPublicKey(createPrivateKey(p)).export({ type: "spki", format: "pem" }).toString();
  const VERIFIER_PRIV = priv("stage-vfc");
  const PRODUCER_PRIV = priv("stage-vfc-producer");

  const verifier = {
    identity_subject: "simurgh-verifier",
    public_key_pem: pubPem(VERIFIER_PRIV),
    key_fingerprint: fingerprint(pubPem(VERIFIER_PRIV)),
    anchor_type: "none",
    anchor_subject: "",
  };
  const producer = {
    identity_subject: "operator-separated-producer",
    public_key_pem: pubPem(PRODUCER_PRIV),
    key_fingerprint: fingerprint(pubPem(PRODUCER_PRIV)),
    anchor_type: "none",
    anchor_subject: "",
  };

  const corpus = {
    schema: "simurgh.vfc.corpus.v1",
    cases: [{ case_id: "c1", source_text_digest: sha256Hex("benign fixture input") }],
  };
  const panelPlan = {
    schema: "simurgh.vfc.panel_plan.v1",
    detector: "prompt_guard_2_86m",
    threshold: "0.5000",
  };
  const detectorSnapshot = {
    schema: "simurgh.vfc.detector_snapshot.v1",
    model_id: "meta-llama/Llama-Prompt-Guard-2-86M",
    revision: "a8ded8e697ce7c355e395a0df51f94adb4a2fd27",
  };

  const receiptContent = {
    challenge_id: "vfc-evidence-challenge-0001",
    nonce: Buffer.from("f".repeat(64), "hex").toString("base64"),
    panel_plan_digest: artifactDigest(panelPlan),
    corpus_digest: artifactDigest(corpus),
    detector_snapshot_digest: artifactDigest(detectorSnapshot),
    verifier_identity_digest: identityDigest(verifier, "verifier"),
  };
  const challenge_receipt = {
    schema: VFC_SCHEMAS.challenge_receipt,
    content: receiptContent,
    challenge_record_digest: domainDigest(DOMAIN.challenge_receipt, receiptContent),
    verifier_signature: signContent(VERIFIER_PRIV, DOMAIN.challenge_receipt, receiptContent),
  };

  const capture = {
    schema: VFC_SCHEMAS.capture,
    producer_identity_ref: identityDigest(producer, "producer"),
    detector_snapshot_digest: artifactDigest(detectorSnapshot),
    corpus_digest: artifactDigest(corpus),
    cells: [
      { case_id: "c1", detector_input_digest: sha256Hex("benign fixture input"), label: "benign" },
    ],
  };
  const capture_digest = domainDigest(DOMAIN.capture, capture);

  const transcriptContent = {
    capture_digest,
    producer_identity_digest: identityDigest(producer, "producer"),
    producer_key_fingerprint: producer.key_fingerprint,
    challenge_record_digest: challenge_receipt.challenge_record_digest,
  };

  const census = {
    schema: VFC_SCHEMAS.capture_census,
    challenge_record_digest: challenge_receipt.challenge_record_digest,
    corpus_digest: artifactDigest(corpus),
    attempt_records: [{ record_id: "a1", case_id: "c1", terminal_ref: "t1" }],
    terminal_records: [{ record_id: "t1", case_id: "c1", status: "completed" }],
    capture_digest,
  };

  const content = {
    schema: VFC_SCHEMAS.foreign_capture,
    challenge_receipt,
    producer_transcript: {
      schema: VFC_SCHEMAS.producer_transcript,
      content: transcriptContent,
      producer_signature: signContent(PRODUCER_PRIV, DOMAIN.producer_transcript, transcriptContent),
    },
    verifier_identity: verifier,
    producer_identity: producer,
    capture,
    panel_plan_ref: { path: "panel-plan.json", digest: artifactDigest(panelPlan) },
    corpus_ref: { path: "shared-corpus.json", digest: artifactDigest(corpus) },
    detector_snapshot_ref: {
      path: "detector-snapshot-manifest.json",
      digest: artifactDigest(detectorSnapshot),
    },
    capture_census_digest: domainDigest(DOMAIN.capture_census, census),
    separation_claim: { claimed_rung: "challenge_bound" },
  };
  const bundle = {
    ...content,
    attestation_signature: signContent(VERIFIER_PRIV, DOMAIN.foreign_capture, content),
  };

  const pin = {
    verifier_key_fingerprint: verifier.key_fingerprint,
    verifier_identity_subject: verifier.identity_subject,
    verifier_identity_digest: identityDigest(verifier, "verifier"),
  };
  return { bundle, census, artifacts: { panelPlan, corpus, detectorSnapshot }, pin };
}
