// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — TSA boundaries 366 parse / 367 crypto+attestation / 368 validity+LTV / 369 accuracy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { validBundle } from "./_valid.mjs";

const tok = (v) => v.bundle.anchors[0].tsa_token_digest;
const run = (v) => vtcqVerify(v.bundle, v.cfg, v.facts);

test("non-canonical DER → 366", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].canonicalDer = false;
  assert.equal(run(v).raw, 366);
});

test("invalid CMS crypto result → 367", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].cryptoResult = "invalid";
  assert.equal(run(v).raw, 367);
});

test("swapped adapter-attestation token_raw_digest → 367", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].attestation.token_raw_digest = "sha256:someone-elses-token";
  assert.equal(run(v).raw, 367);
});

test("cert invalid at genTime → 368", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].certValidAtGenTime = false;
  assert.equal(run(v).raw, 368);
});

test("committed-LTV status evidence invalid → 368", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].ltvOk = false;
  assert.equal(run(v).raw, 368);
});

test("accuracy absent from token AND policy → 369 (fail closed)", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].accuracy_s = null;
  v.cfg.accuracy_policy_s = null;
  assert.equal(run(v).raw, 369);
});

test("accuracy resolvable from policy → passes 369", () => {
  const v = validBundle();
  v.facts.tsaCrypto[tok(v)].accuracy_s = null; // token has none
  v.cfg.accuracy_policy_s = 2; // policy supplies it
  assert.notEqual(run(v).raw, 369);
});
