// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR core (plan Task 7) — frozen order, tier gating, 174 signature, 180 wrapper.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import {
  evaluateVlr,
  evaluateVlrSafe,
} from "../../../../tools/simurgh-attestation/stage4x/core/vlrCore.mjs";
import {
  computeLedgerFromLiveGate,
  computeLedgerFromSealedOutcomes,
} from "../../../../tools/simurgh-attestation/stage4x/core/residueLedger.mjs";
import { greenCorpus, clone } from "./_corpusHelper.mjs";

function signedBundle() {
  const corpus = greenCorpus();
  const ledger = computeLedgerFromLiveGate(corpus);
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
  const body = {
    schema: "simurgh.vlr.attestation.v1",
    corpus_digest: "sha256:" + "a".repeat(64),
    ledger_digest: "sha256:" + "b".repeat(64),
    signing_key_digest: keyDigest(publicKeyPem),
  };
  const signature = crypto.sign(null, Buffer.from(canonicalJson(body)), privateKey).toString("hex");
  return { bundle: { corpus, ledger, attestation: { ...body, signature } }, publicKeyPem };
}

test("green bundle → raw 0 in both tiers", () => {
  const { bundle, publicKeyPem } = signedBundle();
  assert.deepEqual(evaluateVlr(bundle, { tier: "public", publicKeyPem }), { raw: 0 });
  assert.deepEqual(evaluateVlr(bundle, { tier: "audit", publicKeyPem }), { raw: 0 });
});

test("174 on a tampered signature and on a wrong key digest", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const t1 = clone(bundle);
  t1.attestation.signature = "00" + t1.attestation.signature.slice(2);
  assert.equal(evaluateVlr(t1, { publicKeyPem }).raw, 174);
  const t2 = clone(bundle);
  t2.attestation.signing_key_digest = "sha256:" + "0".repeat(64);
  assert.equal(evaluateVlr(t2, { publicKeyPem }).raw, 174);
});

test("177 is audit-only: swapped pack is public-green, audit-red", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const tampered = clone(bundle);
  const outcomes = clone(bundle.ledger.per_item_outcomes);
  outcomes.find((o) => o.item_id === "i1").residue_v1 = true; // claim v1 caught i1's paraphrase
  // Recompute aggregates so the ARITHMETIC stays self-consistent (178 passes)...
  tampered.ledger = computeLedgerFromSealedOutcomes(bundle.corpus, outcomes);
  assert.deepEqual(evaluateVlr(tampered, { tier: "public", publicKeyPem }), { raw: 0 });
  // ...but the live gate disagrees → audit tier fires 177.
  assert.equal(evaluateVlr(tampered, { tier: "audit", publicKeyPem }).raw, 177);
});

test("178 public: hand-edited aggregate (not recomputed)", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const t = clone(bundle);
  t.ledger.metamorphic_slip_rate_v2 = "0/6";
  assert.equal(evaluateVlr(t, { tier: "public", publicKeyPem }).raw, 178);
});

test("179: lying monotone flag", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const t = clone(bundle);
  t.ledger.monotone = false;
  assert.equal(evaluateVlr(t, { publicKeyPem }).raw, 179);
});

test("180: evaluateVlrSafe fails closed on a throw past the signature gate", () => {
  const { bundle, publicKeyPem } = signedBundle();
  const t = clone(bundle);
  t.ledger.per_item_outcomes = 42; // structurally broken → throws at 178
  assert.equal(evaluateVlrSafe(t, { tier: "public", publicKeyPem }).raw, 180);
});
