// SPDX-License-Identifier: AGPL-3.0-or-later
import { sign, verify } from "node:crypto";
import { domainBytes, publicKeyFingerprint, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { ledgerDigest } from "../stage4k/extractionLedger.mjs";
import {
  CCB_ATTESTATION_SCHEMA,
  CCB_KNOWN_LIMITATIONS,
  CCB_MANIFEST_DOMAIN,
  CCB_MANIFEST_SCHEMA,
  CCB_NON_CLAIMS,
} from "./constants.mjs";
import {
  assignmentLedgerDigest,
  cardinalityDigest,
  checkCompleteness,
} from "./clusterAssignmentLedger.mjs";
import { aggregateClusterExposure, checkClusterBudgets } from "./clusterBudgetGate.mjs";

export const ccbPolicyDigest = (policy) => `sha256:${sha256Canonical(policy)}`;
export const ccbAttestationDigest = (attestation) => `sha256:${sha256Canonical(attestation)}`;

// Faithful record: over-budget clusters appear with under_budget:false and in
// denied_over_cluster_budget. Structural invalidity (completeness, policy drift) is refused.
export function buildCcbAttestation({
  exposureLedger,
  assignmentLedger,
  cardinality,
  policy,
  ebaManifestDigest,
}) {
  const completeness = checkCompleteness(exposureLedger, assignmentLedger);
  if (!completeness.ok) throw new Error(`attestation_refused: ${completeness.reason}`);
  const totals = aggregateClusterExposure(exposureLedger, assignmentLedger);
  const gate = checkClusterBudgets(totals, policy);
  if (!gate.ok && gate.rawCode !== 41) throw new Error(`attestation_refused: ${gate.reason}`);
  return {
    schema: CCB_ATTESTATION_SCHEMA,
    window: policy.window,
    q9_status: gate.ok ? "pass" : "over_budget",
    exposure_ledger_digest: ledgerDigest(exposureLedger),
    assignment_ledger_digest: assignmentLedgerDigest(assignmentLedger),
    cluster_budget_policy_digest: ccbPolicyDigest(policy),
    cluster_cardinality_digest: cardinalityDigest(cardinality),
    eba_manifest_digest: ebaManifestDigest,
    cluster_totals: totals.map((t) => ({
      ...t,
      budget: policy.budgets[t.cluster_commitment],
      under_budget: t.cluster_weighted_total <= policy.budgets[t.cluster_commitment],
    })),
    per_account: exposureLedger.entries.map((e) => ({
      consumer_id_digest: e.consumer_id_digest,
      weighted_total: e.weighted_total,
    })),
    denied_over_cluster_budget: gate.offending,
    known_limitations: [...CCB_KNOWN_LIMITATIONS],
    corroborating_commitments: [],
    non_claims: [...CCB_NON_CLAIMS],
  };
}

export function buildCcbManifest({
  assignmentLedger,
  attestation,
  policy,
  cardinality,
  ebaManifestDigest,
  privateKey,
  publicKeyPem,
}) {
  const payload = {
    schema: CCB_MANIFEST_SCHEMA,
    assignment_ledger_digest: assignmentLedgerDigest(assignmentLedger),
    attestation_digest: ccbAttestationDigest(attestation),
    cluster_budget_policy_digest: ccbPolicyDigest(policy),
    cluster_cardinality_digest: cardinalityDigest(cardinality),
    eba_manifest_digest: ebaManifestDigest,
  };
  const signature = `ed25519:${sign(null, domainBytes(CCB_MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return {
    ...payload,
    signature,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKeyPem)}`,
  };
}

export function verifyCcbManifest({
  manifest,
  assignmentLedger,
  attestation,
  policy,
  cardinality,
  ebaManifestDigest,
  publicKey,
}) {
  const { signature, public_key_fingerprint, ...payload } = manifest;
  if (payload.schema !== CCB_MANIFEST_SCHEMA) {
    return { ok: false, reason: "manifest_schema_mismatch" };
  }
  if (payload.assignment_ledger_digest !== assignmentLedgerDigest(assignmentLedger)) {
    return { ok: false, reason: "assignment_ledger_digest_mismatch" };
  }
  if (payload.attestation_digest !== ccbAttestationDigest(attestation)) {
    return { ok: false, reason: "attestation_digest_mismatch" };
  }
  if (payload.cluster_budget_policy_digest !== ccbPolicyDigest(policy)) {
    return { ok: false, reason: "policy_digest_mismatch" };
  }
  if (payload.cluster_cardinality_digest !== cardinalityDigest(cardinality)) {
    return { ok: false, reason: "cardinality_digest_mismatch" };
  }
  if (payload.eba_manifest_digest !== ebaManifestDigest) {
    return { ok: false, reason: "eba_binding_mismatch" };
  }
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "signature_malformed" };
  }
  try {
    const ok = verify(
      null,
      domainBytes(CCB_MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(signature.slice("ed25519:".length), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }
}
