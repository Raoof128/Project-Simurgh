// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 30 — the attestation root, which binds a MAP rather than a certificate.
//
// A SINGULAR `quorum_certificate` ROOT CANNOT REPRESENT THIS STAGE (§13, B9). Two checkpoints are
// compared, each with its own quorum status, and the four met/incomplete combinations are the
// stage's central evidence. A root that bound one certificate would have to pick one of the two
// views, and the picking would be invisible in the signed bytes.
//
// So the root binds a SET of compared envelope digests and a MAP from each digest to its quorum
// status, plus every status, every digest, the finding-ledger digest, the exact signed non-claim ID
// set, the declared witness class mix, the Lane B environment sentence, and the C1 binding.
//
// TWO TIERS. The public tier is what anyone can check with the committed public key. The audit tier
// adds the material a reviewer with the evidence pack can recompute. Neither tier needs a private
// key, which is why the verifier REFUSES `--key`: a verifier that accepts one invites somebody to
// hand it the signing key and call the result a verification.

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
} from "node:crypto";

import { canonicalJson } from "../core/canonical.mjs";
import { NON_CLAIM_IDS } from "../core/claimGate.mjs";

export const ATTESTATION_SCHEMA = "simurgh.vwq.attestation.v1";
const ATTESTATION_DOMAIN = "simurgh.vwq.attestation-root.v1";

export const ATTESTATION_REFUSALS = Object.freeze({
  SCHEMA_UNSUPPORTED: "ATTESTATION_SCHEMA_UNSUPPORTED",
  ROOT_MISMATCH: "ATTESTATION_ROOT_MISMATCH",
  SIGNATURE_INVALID: "ATTESTATION_SIGNATURE_INVALID",
  KEY_DIGEST_MISMATCH: "ATTESTATION_KEY_DIGEST_MISMATCH",
  BINDING_ABSENT: "ATTESTATION_BINDING_ABSENT",
  NON_CLAIM_SET_MISMATCH: "ATTESTATION_NON_CLAIM_SET_MISMATCH",
  QUORUM_MAP_INCOMPLETE: "ATTESTATION_QUORUM_MAP_INCOMPLETE",
});

/** Every binding the root must carry. A missing one is a refusal, not a shorter attestation. */
export const REQUIRED_BINDINGS = Object.freeze([
  "compared_checkpoint_envelope_digests",
  "quorum_status_by_envelope_digest",
  "witness_policy_digest",
  "comparison_policy_digest",
  "comparison_manifest_digest",
  "receipt_or_unavailable_root",
  "comparison_status",
  "intake_complete",
  "witness_independence_status",
  "external_corroboration_status",
  "lane_c_capture_state",
  "finding_ledger_digest",
  "equivocation_artifact_status",
  "signed_non_claim_ids",
  "declared_witness_class_mix",
  "lane_b_environment",
  "c1_binding",
]);

const sha256 = (t) => createHash("sha256").update(t, "utf8").digest("hex");

export const keyDigest = (pem) => `sha256:${sha256(String(pem))}`;

/** The signed root: canonical bytes over every binding, domain-separated. */
export function attestationRoot(body) {
  return sha256(`${ATTESTATION_DOMAIN}\n${canonicalJson(body)}`);
}

/**
 * Build the attestation body. Pure — it takes facts and arranges them, and computes no verdicts.
 */
export function buildBody(facts) {
  const digests = [...(facts.compared_checkpoint_envelope_digests ?? [])].sort();
  const body = {
    schema: ATTESTATION_SCHEMA,
    // A SET of compared digests, and a MAP keyed by them. Neither collapses to a certificate.
    compared_checkpoint_envelope_digests: digests,
    quorum_status_by_envelope_digest: Object.fromEntries(
      Object.entries(facts.quorum_status_by_envelope_digest ?? {}).sort(([a], [b]) =>
        a < b ? -1 : 1
      )
    ),
    witness_policy_digest: facts.witness_policy_digest,
    comparison_policy_digest: facts.comparison_policy_digest,
    comparison_manifest_digest: facts.comparison_manifest_digest,
    receipt_or_unavailable_root: facts.receipt_or_unavailable_root,
    comparison_status: facts.comparison_status,
    intake_complete: facts.intake_complete === true,
    witness_independence_status: facts.witness_independence_status,
    external_corroboration_status: facts.external_corroboration_status,
    lane_c_capture_state: facts.lane_c_capture_state,
    finding_ledger_digest: facts.finding_ledger_digest,
    equivocation_artifact_status: facts.equivocation_artifact_status,
    // The EXACT set from Task 29, bound rather than described.
    signed_non_claim_ids: [...NON_CLAIM_IDS].sort(),
    declared_witness_class_mix: facts.declared_witness_class_mix,
    lane_b_environment: facts.lane_b_environment,
    c1_binding: facts.c1_binding,
  };
  return body;
}

/** Sign a body with the operator's key. The private key never leaves this call. */
export function signAttestation(body, privateKeyPem) {
  const privateKey = createPrivateKey(privateKeyPem);
  const publicKeyPem = createPublicKey(privateKey)
    .export({ type: "spki", format: "pem" })
    .toString();
  const root = attestationRoot(body);
  return {
    schema: ATTESTATION_SCHEMA,
    body,
    attestation_root: root,
    signing_key_digest: keyDigest(publicKeyPem),
    signature_profile: "ed25519",
    signature: edSign(null, Buffer.from(root, "utf8"), privateKey).toString("base64"),
  };
}

/**
 * Verify an envelope from public inputs only. Pure; never throws.
 *
 * @returns {{ok: boolean, refusals: Array<object>, tier: string}}
 */
export function verifyAttestation(envelope, publicKeyPem, { tier = "public" } = {}) {
  const refusals = [];
  const bad = (reason, detail) => refusals.push({ reason, detail });

  if (!envelope || typeof envelope !== "object" || envelope.schema !== ATTESTATION_SCHEMA) {
    return {
      ok: false,
      refusals: [
        { reason: ATTESTATION_REFUSALS.SCHEMA_UNSUPPORTED, detail: String(envelope?.schema) },
      ],
      tier,
    };
  }
  const body = envelope.body;
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      refusals: [{ reason: ATTESTATION_REFUSALS.SCHEMA_UNSUPPORTED, detail: "no body" }],
      tier,
    };
  }

  for (const binding of REQUIRED_BINDINGS) {
    if (body[binding] === undefined || body[binding] === null) {
      bad(ATTESTATION_REFUSALS.BINDING_ABSENT, binding);
    }
  }

  // The non-claim set is bound EXACTLY. A subset would let a release drop the inconvenient ones.
  const bound = [...(body.signed_non_claim_ids ?? [])].sort();
  if (canonicalJson(bound) !== canonicalJson([...NON_CLAIM_IDS].sort())) {
    bad(
      ATTESTATION_REFUSALS.NON_CLAIM_SET_MISMATCH,
      `bound ${bound.length} of ${NON_CLAIM_IDS.length}`
    );
  }

  // Every compared digest must appear in the quorum map. A map short by one is a view whose quorum
  // status was never stated, which is precisely the collapse a certificate root would have forced.
  const compared = body.compared_checkpoint_envelope_digests ?? [];
  const map = body.quorum_status_by_envelope_digest ?? {};
  for (const digest of compared) {
    if (!(digest in map)) {
      bad(ATTESTATION_REFUSALS.QUORUM_MAP_INCOMPLETE, `no quorum status for ${digest}`);
    }
  }
  for (const digest of Object.keys(map)) {
    if (!compared.includes(digest)) {
      bad(
        ATTESTATION_REFUSALS.QUORUM_MAP_INCOMPLETE,
        `${digest} has a status and was not compared`
      );
    }
  }

  // The root, recomputed.
  if (attestationRoot(body) !== envelope.attestation_root) {
    bad(ATTESTATION_REFUSALS.ROOT_MISMATCH, "the root does not cover the body");
  }
  if (keyDigest(publicKeyPem) !== envelope.signing_key_digest) {
    bad(ATTESTATION_REFUSALS.KEY_DIGEST_MISMATCH, "the supplied key is not the one bound");
  }

  let signatureOk = false;
  try {
    signatureOk = edVerify(
      null,
      Buffer.from(envelope.attestation_root, "utf8"),
      createPublicKey(publicKeyPem),
      Buffer.from(String(envelope.signature), "base64")
    );
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) bad(ATTESTATION_REFUSALS.SIGNATURE_INVALID, "the signature does not verify");

  return { ok: refusals.length === 0, refusals, tier };
}
