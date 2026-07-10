// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — signature gate (plan Task 4, raw 269).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkSignature } from "../../../../tools/simurgh-attestation/stage5f/core/signature.mjs";
import { fixture, validBundle } from "./_validBundle.mjs";

test("valid signature under the externally pinned fingerprint -> null", () => {
  assert.equal(checkSignature(validBundle(), fixture.pinnedFingerprint), null);
});

test("no pinned fingerprint supplied -> 269 (never self-authenticating)", () => {
  assert.equal(checkSignature(validBundle(), undefined), 269);
});

test("wrong pinned fingerprint -> 269", () => {
  assert.equal(checkSignature(validBundle(), "sha256:deadbeef"), 269);
});

test("tampered content -> 269", () => {
  const b = validBundle();
  b.non_claims.push("smuggled");
  assert.equal(checkSignature(b, fixture.pinnedFingerprint), 269);
});
