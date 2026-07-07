import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  narrativeBodyDigest,
  buildNarrativeBinding,
  verifyNarrativeBinding,
  checkEvidenceLocality,
  checkJudgments,
} from "../../../../tools/simurgh-attestation/stage4w/core/narrativeBinding.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";
import {
  recordDigest,
  canonicalJson,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const jPub = publicKey.export({ type: "spki", format: "pem" });
const jPriv = privateKey;
const signedJudgment = (() => {
  const content = { judgment_text_digest: "sha256:" + sha256Hex(canonicalJson({ note: "j" })) };
  const signature = crypto
    .sign(null, Buffer.from(canonicalJson(content)), jPriv)
    .toString("base64");
  return { content, signature, judgment_pub_key_pem: jPub };
})();

test("body digest is over BYTES, not canonicalJson", () => {
  assert.equal(narrativeBodyDigest("hi\n"), "sha256:" + sha256Hex("hi\n"));
  assert.notEqual(narrativeBodyDigest("hi\n"), "sha256:" + sha256Hex(canonicalJson("hi\n")));
});

test("binding verifies and 166 fires per-field", () => {
  const g = buildGreenBundle();
  const body = "calm text\n";
  const b = buildNarrativeBinding(g.bundle, g.pubKeyPem, body, []);
  const narrative = { narrative_body: body, span_map: [], binding: b };
  assert.equal(verifyNarrativeBinding(narrative, g.bundle, g.pubKeyPem), null);
  const bad = { ...narrative, binding: { ...b, capsule_root: "sha256:" + "0".repeat(64) } };
  assert.equal(verifyNarrativeBinding(bad, g.bundle, g.pubKeyPem).raw, 166);
});

test("locality 167: span citing a digest outside the sealed set", () => {
  const g = buildGreenBundle();
  const foreign = {
    span_map: [{ span_id: "s1", type: "slot_bound", evidence_digest: recordDigest({ alien: 1 }) }],
  };
  assert.equal(checkEvidenceLocality(foreign, g.bundle).raw, 167);
  const sealed = g.bundle.content.evidence_artifacts[0];
  const local = {
    span_map: [{ span_id: "s1", type: "slot_bound", evidence_digest: recordDigest(sealed) }],
  };
  assert.equal(checkEvidenceLocality(local, g.bundle), null);
});

test("judgments 168: dup id, missing ref, digest mismatch, bad signature, unreferenced", () => {
  const jd = recordDigest(signedJudgment);
  const ok = {
    span_map: [{ span_id: "s1", type: "judgment", judgment_id: "j1", judgment_digest: jd }],
    judgments: [{ judgment_id: "j1", signed_judgment: signedJudgment }],
  };
  assert.equal(checkJudgments(ok), null);
  assert.equal(checkJudgments({ ...ok, judgments: [...ok.judgments, ...ok.judgments] }).raw, 168); // dup id
  assert.equal(checkJudgments({ ...ok, judgments: [] }).raw, 168); // missing ref
  const wrongDigest = {
    ...ok,
    span_map: [{ ...ok.span_map[0], judgment_digest: "sha256:" + "0".repeat(64) }],
  };
  assert.equal(checkJudgments(wrongDigest).raw, 168);
  const tampered = {
    ...ok,
    judgments: [{ judgment_id: "j1", signed_judgment: { ...signedJudgment, signature: "AAAA" } }],
  };
  assert.equal(checkJudgments(tampered).raw, 168);
  const unreferenced = {
    span_map: [],
    judgments: [{ judgment_id: "jx", signed_judgment: signedJudgment }],
  };
  assert.equal(checkJudgments(unreferenced).raw, 168);
});
