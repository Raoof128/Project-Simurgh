// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5E VDA — core evaluator + full tamper matrix in first-failure order (plan Task 8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  evaluateVda,
  evaluateVdaSafe,
  contentOf,
  signBundle,
  keyFingerprint,
} from "../../../../tools/simurgh-attestation/stage5e/core/vdaCore.mjs";
import { scoreTableDigest } from "../../../../tools/simurgh-attestation/stage5e/core/detector.mjs";
import { buildValidBundle } from "./_validBundle.mjs";

const base = buildValidBundle();
const opts = {
  pinnedKeyFingerprint: base.pinnedKeyFingerprint,
  reviewerPubKeyPem: base.pubPem,
  auditPrivate: base.auditPrivate,
};

// deep clone, mutate, then RE-SIGN with the pinned key so the target check (not 256) fires.
function tamper(mutate) {
  const b = structuredClone(base.bundle);
  mutate(b);
  b.signature = signBundle(contentOf(b), base.privatePem);
  return b;
}
const resyncScoreDigest = (b) => (b.score_table.digest = scoreTableDigest(b.score_table.entries));

test("valid bundle verifies raw 0 at both tiers", () => {
  assert.equal(evaluateVda(base.bundle, { ...opts, tier: "public" }).raw, 0);
  assert.equal(evaluateVda(base.bundle, { ...opts, tier: "audit" }).raw, 0);
});

test("255 — unknown outer key / wrong schema", () => {
  const b = tamper((x) => (x.surprise = 1));
  assert.equal(evaluateVda(b, opts).raw, 255);
});

test("256 — bad signature (mutate, no re-sign)", () => {
  const b = structuredClone(base.bundle);
  b.detector.hf_revision = "tampered"; // signature no longer matches
  assert.equal(evaluateVda(b, opts).raw, 256);
});

test("256 — key swap + re-sign is caught by the external fingerprint pin", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const b = structuredClone(base.bundle);
  b.attestation_pub_key_pem = publicKey.export({ type: "spki", format: "pem" });
  b.signature = signBundle(contentOf(b), privateKey.export({ type: "pkcs8", format: "pem" }));
  // signature is internally valid, but the embedded key's fingerprint != the pinned one
  assert.notEqual(keyFingerprint(b.attestation_pub_key_pem), base.pinnedKeyFingerprint);
  assert.equal(evaluateVda(b, opts).raw, 256);
});

test("257 — detector revision unbound from capture", () => {
  const b = tamper((x) => (x.capture_provenance.detector_revision = "other"));
  assert.equal(evaluateVda(b, opts).raw, 257);
});

test("258 — an evasion recipe is invalid", () => {
  const b = tamper((x) => (x.evasions[0].recipe = [{ op: "not_a_real_op" }]));
  assert.equal(evaluateVda(b, opts).raw, 258);
});

test("259 — score-table digest mismatch", () => {
  const b = tamper((x) => (x.score_table.digest = "sha256:" + "0".repeat(64)));
  assert.equal(evaluateVda(b, opts).raw, 259);
});

test("260 — threshold_crossing disagrees with recompute", () => {
  const b = tamper((x) => (x.evasions[0].threshold_crossing = !x.evasions[0].threshold_crossing));
  assert.equal(evaluateVda(b, opts).raw, 260);
});

test("261 — score_inversion claimed without a real inversion", () => {
  const b = tamper((x) => {
    // raise b1's evasion score above its raw so the inversion is false, but keep the claim true
    const e = x.score_table.entries.find((e) => e.base_id === "b1" && e.variant === "evasion");
    e.score = "0.9900";
    resyncScoreDigest(x);
    const ev = x.evasions.find((e) => e.base_id === "b1");
    ev.threshold_crossing = false; // 0.99 ≥ 0.5 → no crossing (avoid 260)
    ev.score_inversion = true; // but 0.99 > 0.98 → no inversion
  });
  assert.equal(evaluateVda(b, opts).raw, 261);
});

test("262 — curve point disagrees", () => {
  const b = tamper((x) => (x.evasion_threshold_curve[0].variants_flagged = 2));
  assert.equal(evaluateVda(b, opts).raw, 262);
});

test("263 — FP-curve point disagrees", () => {
  const b = tamper((x) => (x.benign_fp_curve[1].false_positives = 0));
  assert.equal(evaluateVda(b, opts).raw, 263);
});

test("264 — forbidden defeat phrase in analyst_note (public)", () => {
  const b = tamper((x) => (x.analyst_note = "the detector is unsafe"));
  assert.equal(evaluateVda(b, { ...opts, tier: "public" }).raw, 264);
});

test("265 — capture provenance unbound from the score table", () => {
  const b = tamper((x) => (x.capture_provenance.score_table_digest = "sha256:" + "1".repeat(64)));
  assert.equal(evaluateVda(b, opts).raw, 265);
});

test("266 — a census slip omitted from evasions (audit only; public stays 0)", () => {
  const b = tamper((x) => (x.evasions = x.evasions.filter((e) => e.base_id !== "b1")));
  assert.equal(evaluateVda(b, { ...opts, tier: "audit" }).raw, 266);
  assert.equal(evaluateVda(b, { ...opts, tier: "public" }).raw, 0);
});

test("267 — a throw past the gates wraps fail-closed", () => {
  // a BigInt in the supplied census makes canonicalJson throw inside the audit-only check
  const got = evaluateVdaSafe(base.bundle, {
    ...opts,
    tier: "audit",
    auditPrivate: { entries: [{ x: 1n }] },
  });
  assert.equal(got.raw, 267);
});
