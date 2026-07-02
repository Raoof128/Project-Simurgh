// SPDX-License-Identifier: AGPL-3.0-or-later
import { sign, verify } from "node:crypto";
import { domainBytes, publicKeyFingerprint, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { checkBudgets } from "./extractionBudgetGate.mjs";
import { ledgerDigest } from "./extractionLedger.mjs";
import {
  EBA_ATTESTATION_SCHEMA,
  EBA_MANIFEST_DOMAIN,
  EBA_MANIFEST_SCHEMA,
  SIGNAL_CLASS_WEIGHTS,
} from "./constants.mjs";

export const budgetPolicyDigest = (policy) => `sha256:${sha256Canonical(policy)}`;
export const attestationDigest = (attestation) => `sha256:${sha256Canonical(attestation)}`;

// An attestation is a faithful record: over-budget consumers appear with under_budget:false
// and in denied_over_budget. But an INVALID policy (weight drift, schema drift, missing
// budgets) is refused outright — never attested over.
export function buildAttestation({ ledger, policy, dfiCertificateDigest }) {
  const gate = checkBudgets(ledger, policy);
  if (!gate.ok && gate.rawCode !== 30) {
    throw new Error(`attestation_refused: ${gate.reason}`);
  }
  return {
    schema: EBA_ATTESTATION_SCHEMA,
    class_weights: { ...SIGNAL_CLASS_WEIGHTS },
    budget_policy_digest: budgetPolicyDigest(policy),
    ledger_digest: ledgerDigest(ledger),
    dfi_certificate_digest: dfiCertificateDigest,
    per_consumer: ledger.entries.map((e) => ({
      consumer_id_digest: e.consumer_id_digest,
      window: e.window,
      weighted_total: e.weighted_total,
      budget: policy.budgets[e.consumer_id_digest],
      under_budget: e.weighted_total <= policy.budgets[e.consumer_id_digest],
    })),
    denied_over_budget: gate.offending,
  };
}

// Acyclic: the manifest references ledger/attestation/policy/DFI digests; the attestation
// excludes the manifest and its signature. Signed with the stage-4K key, domain-separated.
export function buildEbaManifest({
  ledger,
  attestation,
  policy,
  dfiCertificateDigest,
  privateKey,
  publicKeyPem,
}) {
  const payload = {
    schema: EBA_MANIFEST_SCHEMA,
    ledger_digest: ledgerDigest(ledger),
    attestation_digest: attestationDigest(attestation),
    budget_policy_digest: budgetPolicyDigest(policy),
    dfi_certificate_digest: dfiCertificateDigest,
  };
  const signature = `ed25519:${sign(null, domainBytes(EBA_MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return {
    ...payload,
    signature,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKeyPem)}`,
  };
}

export function verifyEbaManifest({
  manifest,
  ledger,
  attestation,
  policy,
  dfiCertificateDigest,
  publicKey,
}) {
  const { signature, public_key_fingerprint, ...payload } = manifest;
  if (payload.schema !== EBA_MANIFEST_SCHEMA)
    return { ok: false, reason: "manifest_schema_mismatch" };
  if (payload.ledger_digest !== ledgerDigest(ledger)) {
    return { ok: false, reason: "ledger_digest_mismatch" };
  }
  if (payload.attestation_digest !== attestationDigest(attestation)) {
    return { ok: false, reason: "attestation_digest_mismatch" };
  }
  if (payload.budget_policy_digest !== budgetPolicyDigest(policy)) {
    return { ok: false, reason: "budget_policy_digest_mismatch" };
  }
  if (payload.dfi_certificate_digest !== dfiCertificateDigest) {
    return { ok: false, reason: "dfi_binding_mismatch" };
  }
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "signature_malformed" };
  }
  try {
    const ok = verify(
      null,
      domainBytes(EBA_MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(signature.slice("ed25519:".length), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }
}
