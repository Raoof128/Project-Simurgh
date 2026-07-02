// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { SIGNAL_CLASS_WEIGHTS } from "../../../../tools/simurgh-attestation/stage4k/constants.mjs";
import {
  attestationDigest,
  budgetPolicyDigest,
  buildAttestation,
  buildEbaManifest,
  verifyEbaManifest,
} from "../../../../tools/simurgh-attestation/stage4k/ebaManifest.mjs";
import {
  buildLedger,
  consumerIdDigest,
} from "../../../../tools/simurgh-attestation/stage4k/extractionLedger.mjs";

const ev = (over = {}) => ({
  event_id: "ev_001",
  consumer_id: "consumer_alpha",
  session_id: "session_a",
  window: "2026-07",
  signal_class: "final_answer",
  response_id_digest: `sha256:${"a".repeat(64)}`,
  ...over,
});
const alpha = consumerIdDigest("consumer_alpha");
const DFI = `sha256:${"b".repeat(64)}`;
const mk = (budget) => {
  const ledger = buildLedger([ev()]);
  const policy = {
    schema: "simurgh.eba.budget-policy.v1",
    window: "2026-07",
    class_weights: { ...SIGNAL_CLASS_WEIGHTS },
    budgets: { [alpha]: budget },
  };
  return { ledger, policy };
};

test("attestation records per-consumer verdicts and the digest chain", () => {
  const { ledger, policy } = mk(5);
  const att = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  assert.equal(att.schema, "simurgh.eba.attestation.v1");
  assert.deepEqual(att.class_weights, SIGNAL_CLASS_WEIGHTS);
  assert.equal(att.budget_policy_digest, budgetPolicyDigest(policy));
  assert.equal(att.dfi_certificate_digest, DFI);
  assert.deepEqual(att.denied_over_budget, []);
  assert.deepEqual(att.per_consumer, [
    {
      consumer_id_digest: alpha,
      window: "2026-07",
      weighted_total: 1,
      budget: 5,
      under_budget: true,
    },
  ]);
});

test("over-budget IS attestable and recorded honestly", () => {
  const { ledger, policy } = mk(0);
  const att = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  assert.deepEqual(att.denied_over_budget, [alpha]);
  assert.equal(att.per_consumer[0].under_budget, false);
});

test("attestation over an invalid policy is refused, never built", () => {
  const { ledger, policy } = mk(5);
  policy.class_weights.final_answer = 100;
  assert.throws(
    () => buildAttestation({ ledger, policy, dfiCertificateDigest: DFI }),
    /attestation_refused: weights_mismatch/
  );
});

test("manifest signs the full digest chain and verifies round-trip", () => {
  const { ledger, policy } = mk(5);
  const att = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const manifest = buildEbaManifest({
    ledger,
    attestation: att,
    policy,
    dfiCertificateDigest: DFI,
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  assert.equal(manifest.schema, "simurgh.eba.manifest.v1");
  assert.equal(manifest.attestation_digest, attestationDigest(att));
  const ok = verifyEbaManifest({
    manifest,
    ledger,
    attestation: att,
    policy,
    dfiCertificateDigest: DFI,
    publicKey,
  });
  assert.deepEqual(ok, { ok: true });
});

test("any tampered digest link or wrong key fails verification", () => {
  const { ledger, policy } = mk(5);
  const att = buildAttestation({ ledger, policy, dfiCertificateDigest: DFI });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const manifest = buildEbaManifest({
    ledger,
    attestation: att,
    policy,
    dfiCertificateDigest: DFI,
    privateKey,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
  });
  const tampered = { ...manifest, ledger_digest: `sha256:${"c".repeat(64)}` };
  assert.equal(
    verifyEbaManifest({
      manifest: tampered,
      ledger,
      attestation: att,
      policy,
      dfiCertificateDigest: DFI,
      publicKey,
    }).ok,
    false
  );
  const { publicKey: otherKey } = generateKeyPairSync("ed25519");
  assert.equal(
    verifyEbaManifest({
      manifest,
      ledger,
      attestation: att,
      policy,
      dfiCertificateDigest: DFI,
      publicKey: otherKey,
    }).ok,
    false
  );
});
