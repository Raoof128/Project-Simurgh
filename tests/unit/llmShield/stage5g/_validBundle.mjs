// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC "mutate one thing" fixture. Deterministic (fixed nonce, no timestamps) so evidence is
// byte-stable. Builds distinct_key_only and challenge_bound bundles; the externally_anchored variant is
// added in Task 14 (needs the Sigstore fixture). Every mutated-bundle test must call resign() unless it
// targets a signature/digest check, because 284/285/287 gate everything after them.
//
// Digest conventions (written down per gotcha): committed-artifact digests use sha256(canonicalJson(x));
// signed VFC objects use domainDigest(DOMAIN.<obj>, content); identities use identityDigest(id, role).
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  domainDigest,
} from "../../../../tools/simurgh-attestation/stage5g/core/digests.mjs";
import {
  fingerprint,
  signContent,
} from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";
import { DOMAIN, VFC_SCHEMAS } from "../../../../tools/simurgh-attestation/stage5g/constants.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);
const priv = (name) => readFileSync(join(KEYS, `INSECURE_FIXTURE_ONLY_${name}.pem`), "utf8");
const pubPem = (p) =>
  createPublicKey(createPrivateKey(p)).export({ type: "spki", format: "pem" }).toString();

const VERIFIER_PRIV = priv("stage-vfc");
const PRODUCER_PRIV = priv("stage-vfc-producer");

export const artifactDigest = (obj) => sha256Hex(canonicalJson(obj));
export const identityDigest = (id, role) => domainDigest(DOMAIN[`${role}_identity`], id);
export const captureDigest = (capture) => domainDigest(DOMAIN.capture, capture);

export function fixtureIdentities() {
  const verifier = {
    identity_subject: "simurgh-verifier",
    public_key_pem: pubPem(VERIFIER_PRIV),
    key_fingerprint: fingerprint(pubPem(VERIFIER_PRIV)),
    anchor_type: "none",
    anchor_subject: "",
  };
  const producer = {
    identity_subject: "fixture-producer",
    public_key_pem: pubPem(PRODUCER_PRIV),
    key_fingerprint: fingerprint(pubPem(PRODUCER_PRIV)),
    anchor_type: "none",
    anchor_subject: "",
  };
  return { verifier, producer };
}

export function fixtureArtifacts() {
  return {
    corpus: {
      schema: "simurgh.vfc.corpus.v1",
      cases: [{ case_id: "c1", source_text_digest: sha256Hex("benign fixture input") }],
    },
    panelPlan: {
      schema: "simurgh.vfc.panel_plan.v1",
      detector: "prompt_guard_2_86m",
      threshold: "0.5000",
    },
    detectorSnapshot: {
      schema: "simurgh.vfc.detector_snapshot.v1",
      model_id: "meta-llama/Llama-Prompt-Guard-2-86M",
      revision: "a8ded8e697ce7c355e395a0df51f94adb4a2fd27",
    },
  };
}

export function issueChallenge({ corpus, panelPlan, detectorSnapshot, verifierIdentity }) {
  const content = {
    challenge_id: "vfc-fixture-challenge-0001",
    nonce: Buffer.from("f".repeat(64), "hex").toString("base64"), // 32 bytes, FIXED (byte-stable fixture)
    panel_plan_digest: artifactDigest(panelPlan),
    corpus_digest: artifactDigest(corpus),
    detector_snapshot_digest: artifactDigest(detectorSnapshot),
    verifier_identity_digest: identityDigest(verifierIdentity, "verifier"),
  };
  return {
    schema: VFC_SCHEMAS.challenge_receipt,
    content,
    challenge_record_digest: domainDigest(DOMAIN.challenge_receipt, content),
    verifier_signature: signContent(VERIFIER_PRIV, DOMAIN.challenge_receipt, content),
  };
}

function buildCensus({ challengeRecordDigest, corpusDigest, capDigest }) {
  return {
    schema: VFC_SCHEMAS.capture_census,
    challenge_record_digest: challengeRecordDigest ?? null,
    corpus_digest: corpusDigest,
    attempt_records: [{ record_id: "a1", case_id: "c1", terminal_ref: "t1" }],
    terminal_records: [{ record_id: "t1", case_id: "c1", status: "completed" }],
    capture_digest: capDigest,
  };
}

function build({ rung = "challenge_bound" } = {}) {
  const { verifier, producer } = fixtureIdentities();
  const { corpus, panelPlan, detectorSnapshot } = fixtureArtifacts();
  const boundOrHigher = rung === "challenge_bound" || rung === "externally_anchored";
  const receipt = boundOrHigher
    ? issueChallenge({ corpus, panelPlan, detectorSnapshot, verifierIdentity: verifier })
    : undefined;

  const capture = {
    schema: VFC_SCHEMAS.capture,
    producer_identity_ref: identityDigest(producer, "producer"),
    detector_snapshot_digest: artifactDigest(detectorSnapshot),
    corpus_digest: artifactDigest(corpus),
    cells: [
      { case_id: "c1", detector_input_digest: sha256Hex("benign fixture input"), label: "benign" },
    ],
  };
  const capDigest = captureDigest(capture);

  const transcriptContent = {
    capture_digest: capDigest,
    producer_identity_digest: identityDigest(producer, "producer"),
    producer_key_fingerprint: producer.key_fingerprint,
  };
  if (boundOrHigher) transcriptContent.challenge_record_digest = receipt.challenge_record_digest;

  const census = buildCensus({
    challengeRecordDigest: boundOrHigher ? receipt.challenge_record_digest : null,
    corpusDigest: artifactDigest(corpus),
    capDigest,
  });

  const content = {
    schema: VFC_SCHEMAS.foreign_capture,
    ...(boundOrHigher ? { challenge_receipt: receipt } : {}),
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
    separation_claim: { claimed_rung: rung },
  };
  const bundle = {
    ...content,
    attestation_signature: signContent(VERIFIER_PRIV, DOMAIN.foreign_capture, content),
  };
  return { bundle, census };
}

export const validBundle = (opts) => build(opts).bundle;
export const validCensus = (opts) => build(opts).census;
export const fixtureArtifactObjects = fixtureArtifacts;

// Re-derive every digest and re-sign all THREE signed objects (receipt -> verifier, transcript ->
// producer, attestation -> verifier), in dependency order.
export function resign(bundle) {
  const b = structuredClone(bundle);
  if (b.challenge_receipt) {
    b.challenge_receipt.challenge_record_digest = domainDigest(
      DOMAIN.challenge_receipt,
      b.challenge_receipt.content
    );
    b.challenge_receipt.verifier_signature = signContent(
      VERIFIER_PRIV,
      DOMAIN.challenge_receipt,
      b.challenge_receipt.content
    );
  }
  const tc = b.producer_transcript.content;
  tc.capture_digest = captureDigest(b.capture);
  tc.producer_identity_digest = identityDigest(b.producer_identity, "producer");
  tc.producer_key_fingerprint = b.producer_identity.key_fingerprint;
  if (b.challenge_receipt) tc.challenge_record_digest = b.challenge_receipt.challenge_record_digest;
  b.producer_transcript.producer_signature = signContent(
    PRODUCER_PRIV,
    DOMAIN.producer_transcript,
    tc
  );
  const { attestation_signature, ...content } = b;
  return {
    ...content,
    attestation_signature: signContent(VERIFIER_PRIV, DOMAIN.foreign_capture, content),
  };
}
