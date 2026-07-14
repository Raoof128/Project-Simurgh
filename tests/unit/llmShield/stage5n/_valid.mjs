// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — the canonical VALID envelope + injected B11 facts + verifier_config, for hermetic core tests.
// The pure core never runs the 20M chain (that is the node adapter / e2e realGreen job); it decides over
// INJECTED facts. This fixture is structurally real (T=20M profile, real Ed25519 signatures) but its
// delay_proof / recomputed facts are self-consistent stubs so the comparison checks pass without a 14 s run.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { hdsObject } from "../../../../tools/simurgh-attestation/stage5n/core/encoding.mjs";
import {
  startRequestDigest,
  startAuthorisationDigest,
  inputCommitment,
  decisionDigest,
  policyDigest,
  outputCommitment,
  freshnessRequestDigest,
  issuerChallengeDigest,
  finalEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5n/core/derive.mjs";
import {
  T,
  CADENCE,
  DS,
  PROFILE_ID,
  DELAY_ALGORITHM_ID,
  ENVELOPE_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage5n/constants.mjs";

const KEYDIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/llmShield/stage5n/test-keys"
);
const H = (s) => crypto.createHash("sha256").update(s).digest("hex");

function key(role) {
  const priv = crypto.createPrivateKey(
    readFileSync(join(KEYDIR, `INSECURE_FIXTURE_ONLY_${role}.pem`))
  );
  const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
  const fpr =
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(crypto.createPublicKey(priv).export({ type: "spki", format: "der" }))
      .digest("hex");
  return { priv, pubPem, fpr };
}
const sign = (priv, hex) =>
  "base64:" + crypto.sign(null, Buffer.from(hex, "hex"), priv).toString("base64");

// Build a fresh valid {envelope, facts, verifier_config, census}. Deep-clone-friendly (returns new objects).
export function buildValid() {
  const K = { issuer: key("issuer"), producer: key("producer"), finalsigner: key("finalsigner") };
  const run_id = "run-5n-hermetic";

  const input_reference = {
    reference_schema: "simurgh.vtc_delay.input_ref.v1",
    artifact_digest: H("review-item"),
    canonicalisation_profile: "simurgh_canonical_json_v1",
    artifact_type: "review_item",
  };
  const D_in = inputCommitment(input_reference);

  const delay_policy = {
    profile_id: PROFILE_ID,
    delay_algorithm_id: DELAY_ALGORITHM_ID,
    hash_algorithm: "sha256",
    iteration_count_T: T,
    checkpoint_cadence: CADENCE,
    canonical_encoding: "simurgh_canonical_json_v1",
    implementation_digest: H("impl"),
    precommitted_minimum_elapsed_ms: 60_000,
    accepted_freshness_modes: ["issuer_signed"],
    uncertainty_policy: {
      mode: "per_authority",
      per_authority_bounds: { "digicert-tsa": { uncertainty_bound_ms: 1000 } },
      policy_signer_key_id: K.producer.fpr,
    },
    interpretability_policy: { channel: "optional" },
    verifier_limits: {
      max_envelope_bytes: 262144,
      max_checkpoint_count: 16,
      maximum_supported_T: 20_000_000,
    },
    final_signer_fingerprint: K.finalsigner.fpr,
  };
  const delay_policy_digest = policyDigest(delay_policy);

  // Freshness (issuer_signed), fully signed over the challenge content (P0-5).
  const nonce = "nonce-abc";
  const freshness_request = {
    stage_id: "5n",
    run_id,
    D_in,
    delay_policy_digest,
    issuer_key_id: K.issuer.fpr,
  };
  const request_commitment_digest = freshnessRequestDigest(freshness_request);
  const issuer_challenge_content = {
    challenge_schema: "simurgh.vtc_delay.challenge.v1",
    mode: "issuer_signed",
    request_commitment_digest,
    run_id,
    nonce,
    issued_at_ms: 1_783_900_000_000,
    expires_at_ms: 1_783_999_999_000,
    issuer_key_id: K.issuer.fpr,
  };
  const issuer_challenge_digest = issuerChallengeDigest(issuer_challenge_content);
  const freshness_challenge = {
    ...issuer_challenge_content,
    signature: sign(K.issuer.priv, issuer_challenge_digest),
  };

  // Start request + authorisation (producer signature INSIDE the anchored subject, P0-2).
  const start_request = { stage_id: "5n", run_id, D_in, delay_policy_digest, nonce };
  const start_request_digest = startRequestDigest(start_request);
  const start_request_signature = sign(K.producer.priv, start_request_digest);
  const start_authorisation = {
    start_request_digest,
    producer_key_fingerprint: K.producer.fpr,
    start_request_signature,
  };
  const start_authorisation_digest = startAuthorisationDigest(start_authorisation);

  const start_token_digest = H("start-token-der"); // adapter binds the real DER; hermetic stub here
  const seed = hdsObject(DS.seed, { run_id, D_in, start_token_digest, delay_policy_digest });

  // delay_proof stubs (self-consistent; the real 20M chain is exercised in e2e realGreen).
  const terminal_value = H("terminal");
  const x0 = H("x0");
  const checkpoint_ladder = [{ i: CADENCE, value: H("cp") }];
  const execution_declaration = {
    iteration_count: T,
    implementation_digest: delay_policy.implementation_digest,
  };

  const decision_body = {
    decision_schema: "simurgh.vtc_delay.decision.v1",
    verdict: "delay_policy_satisfied",
    reason_codes: [],
    decision_scope_digest: H("scope"),
  };
  const decision_digest = decisionDigest(decision_body);
  const D_out = outputCommitment({
    run_id,
    D_in,
    decision_digest,
    delay_policy_digest,
    start_token_digest,
    iteration_count: T,
    terminal_value,
  });

  const envelope = {
    envelope_schema: ENVELOPE_SCHEMA,
    run_id,
    input_reference,
    D_in,
    delay_policy,
    delay_policy_digest,
    freshness_challenge,
    freshness_request,
    start_request,
    start_authorisation,
    start_token_digest,
    execution_declaration,
    delay_proof: { seed, x0, checkpoint_ladder, terminal_value },
    decision_body,
    decision_digest,
    D_out,
    start_endpoint: { subject_digest: start_authorisation_digest },
    end_endpoint: { subject_digest: D_out },
    interpretability: null,
  };
  envelope.final_envelope_signature = sign(K.finalsigner.priv, finalEnvelopeDigest(envelope));

  const verifier_config = {
    expected_final_signer_fpr: K.finalsigner.fpr,
    expected_producer_fpr: K.producer.fpr,
    expected_issuer_fpr: K.issuer.fpr,
    expected_tsa_verifier_fpr: "sha256:" + "aa".repeat(32),
    expected_rekor_submitter_fpr: "sha256:" + "bb".repeat(32),
    trusted_tsa_roots: ["digicert-root-g4"],
    trusted_rekor_log_keys: ["rekor-prod"],
    authority_registry: {
      "digicert-tsa": {
        uncertainty_bound_ms: 1000,
        uncertainty_basis: "second_granularity_unspecified_accuracy",
      },
    },
    hard_resource_limits: {
      max_raw_bytes: 262144,
      max_depth: 32,
      max_keys: 512,
      max_array: 4096,
      max_string: 131072,
      max_checkpoint_count: 16,
    },
    expected_input_source: input_reference.artifact_digest,
    pinned_issuer_pubkey_pem: K.issuer.pubPem,
    pinned_producer_pubkey_pem: K.producer.pubPem,
    pinned_finalsigner_pubkey_pem: K.finalsigner.pubPem,
  };

  // Injected B11 facts (adapter-produced in production; hermetic-consistent here).
  const facts = {
    recomputed: { x0, checkpoints: checkpoint_ladder, terminal_value },
    startChild: { green: true, raw: 0, reason: "ok", detail: null },
    endChild: { green: true, raw: 0, reason: "ok", detail: null },
    start: {
      authority_id: "digicert-tsa",
      genTime_ms: 1_783_900_100_000,
      accuracy_ms: null,
      token_valid: true,
      subject_extractable: true,
      tsa_imprint: start_authorisation_digest,
      ots_leaf: start_authorisation_digest,
      rekor_artifact_hash: H(start_authorisation_digest),
    },
    end: {
      authority_id: "digicert-tsa",
      genTime_ms: 1_783_900_190_000,
      accuracy_ms: null,
      token_valid: true,
      subject_extractable: true,
      tsa_imprint: D_out,
      ots_leaf: D_out,
      rekor_artifact_hash: H(D_out),
    },
  };
  const census = { prior_seen_keys: [], scope_digest: H("census-scope") };
  return { envelope, facts, verifier_config, census, keys: K, canonicalJson };
}
