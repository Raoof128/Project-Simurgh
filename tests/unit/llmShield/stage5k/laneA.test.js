// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — Task 1.2 crux: the ceremony builder yields U_commit = U_vpc = U_vrc by construction, and
// makeCtx derives the two universes + the 352 downstream mismatch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle, validCfg, fixtureFacts } from "./_validBundle.mjs";
import {
  checkBundleSchema,
  checkConfigSchema,
} from "../../../../tools/simurgh-attestation/stage5k/core/schema.mjs";
import { makeCtx } from "../../../../tools/simurgh-attestation/stage5k/core/context.mjs";

test("the crux fixture is schema-valid (bundle + cfg)", () => {
  assert.equal(checkBundleSchema(validBundle()), null);
  assert.equal(checkConfigSchema(validCfg()), null);
});

test("fixtureFacts earns raw-0 verdicts from the real 5I + 5J verifiers", () => {
  const f = fixtureFacts();
  assert.equal(f.vpc_verdict, 0, "5I re-verify");
  assert.equal(f.vrc_verdict, 0, "5J re-verify");
});

test("U_commit = U_vpc = U_vrc by construction (the whole point)", () => {
  const ctx = makeCtx(validBundle(), validCfg(), fixtureFacts());
  assert.equal(ctx.U_commit.length, 8);
  assert.equal(ctx.setDigest.commit, ctx.setDigest.vpc, "U_commit = U_vpc");
  assert.equal(ctx.setDigest.commit, ctx.setDigest.vrc, "U_commit = U_vrc");
  // derived through projectSection, NOT copied from the bundle
  assert.ok(
    ctx.U_vpc.every(
      (l) => typeof l.subject_digest === "string" && l.subject_digest.startsWith("sha256:")
    )
  );
});

test("makeCtx.downstreamMismatch: null when valid; 352 on tampered ref / unverified upstream", () => {
  assert.equal(makeCtx(validBundle(), validCfg(), fixtureFacts()).downstreamMismatch, null);

  const b = validBundle();
  b.vpc_ref.partition_digest = "sha256:" + "b".repeat(64);
  assert.equal(makeCtx(b, validCfg(), fixtureFacts()).downstreamMismatch.raw, 352);

  const f = fixtureFacts();
  assert.equal(
    makeCtx(validBundle(), validCfg(), { ...f, vrc_verdict: 347 }).downstreamMismatch.raw,
    352
  );
});
