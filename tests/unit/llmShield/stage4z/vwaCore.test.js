// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA vwaCore (plan Task 7) — schema (190), signature (191), frozen order, tier, 198.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { buildMap } from "../../../../tools/simurgh-attestation/stage4z/core/mapCore.mjs";
import {
  attestationBody,
  signAttestation,
  checkSignature,
  evaluateVwa,
  evaluateVwaSafe,
} from "../../../../tools/simurgh-attestation/stage4z/core/vwaCore.mjs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function f32(values) {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
}
const saltFor = (k) => "salt:" + k;
const declaration = {
  schema: "simurgh.vwa.declaration.v1",
  tokens: [{ token: "fake", token_id: 10 }],
  theta_nano: "1000000000",
  corpus_manifest: { prompts: [{ prompt_id: "p0", n_tokens: 1, prompt_digest: "sha256:aa" }] },
  position_rule_id: "all_positions",
  layers: [5],
  tokenizer: "t",
};
const capture = {
  schema: "simurgh.vwa.capture.v1",
  model_id: "m",
  revision_digest: "sha256:rev",
  lens_digest: "sha256:lens",
  declaration_digest: undefined, // filled below
  prompt_token_counts: { p0: 1 },
  ceremony: { outcome: "captured", timestamp: "2026-07-08T00:00:00Z" },
};

function freshBundle() {
  const { map, audit } = buildMap({
    declaration,
    activations: { "p0:0:5": f32([1, 0]) },
    lensRows: { "5:10": f32([2, 0]) },
    saltFor,
  });
  const cap = {
    ...capture,
    declaration_digest: map.declaration_digest,
    commitments: map.commitments,
  };
  const attestation = signAttestation(declaration, cap, map, audit, pubPem, privPem);
  return { declaration, capture: cap, map, audit, attestation };
}

test("a clean bundle verifies at both tiers (0)", () => {
  const b = freshBundle();
  assert.equal(evaluateVwa(b, { tier: "public", publicKeyPem: pubPem }).raw, 0);
  assert.equal(evaluateVwa(b, { tier: "audit", publicKeyPem: pubPem }).raw, 0);
});

test("attestation body binds all FOUR digests via the merkle root", () => {
  const b = freshBundle();
  const body = attestationBody(b.declaration, b.capture, b.map, b.audit, pubPem);
  assert.ok(body.declaration_digest && body.capture_digest && body.map_digest && body.audit_digest);
  assert.match(body.bundle_merkle_root, /^sha256:[a-f0-9]{64}$/);
});

test("191 on a wrong key or tampered signature", () => {
  const b = freshBundle();
  const other = crypto
    .generateKeyPairSync("ed25519")
    .publicKey.export({ type: "spki", format: "pem" })
    .toString();
  assert.equal(checkSignature(b, other).raw, 191);
  const bad = { ...b, attestation: { ...b.attestation, signature: "00" } };
  assert.equal(evaluateVwa(bad, { tier: "public", publicKeyPem: pubPem }).raw, 191);
});

test("190 when a schema is wrong (fires FIRST in the frozen order)", () => {
  const b = freshBundle();
  b.map.schema = "nope";
  assert.equal(evaluateVwa(b, { tier: "public", publicKeyPem: pubPem }).raw, 190);
});

test("195 is AUDIT-ONLY: a doctored score is clean at public, caught at audit", () => {
  const b = freshBundle();
  // Doctor the PUBLISHED score (real dot = 2.0 → "2000000000"); publish 2.5 instead. Keep
  // the tensors+commitments intact (so 193 passes) and flags consistent (2.5 ≥ θ 1.0, so 194
  // aggregates + 196 flag agreement still hold), then re-sign so 191 passes. Only the
  // tensor-recompute (195, audit-only) can catch it.
  b.map.cells[0].scores[0].score_nano = "2500000000";
  b.attestation = signAttestation(b.declaration, b.capture, b.map, b.audit, pubPem, privPem);
  assert.equal(evaluateVwa(b, { tier: "public", publicKeyPem: pubPem }).raw, 0);
  assert.equal(evaluateVwa(b, { tier: "audit", publicKeyPem: pubPem }).raw, 195);
});

test("withheld audit bundle → SKIPPED at audit tier, full verify at public", () => {
  const b = freshBundle();
  const withheld = { ...b, audit: null };
  assert.equal(evaluateVwa(withheld, { tier: "public", publicKeyPem: pubPem }).raw, 0);
  assert.equal(evaluateVwa(withheld, { tier: "audit", publicKeyPem: pubPem }).skipped, true);
});

test("evaluateVwaSafe wraps a throw as 198", () => {
  const r = evaluateVwaSafe(null, { tier: "public", publicKeyPem: pubPem });
  assert.equal(r.raw, 198);
});
