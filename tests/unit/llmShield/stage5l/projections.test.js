// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — 381 audit-only projections (public tier never certifies them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { validBundle } from "./_valid.mjs";

test("audit tier over a valid bundle → raw 0", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  assert.equal(vtcqVerify(v.bundle, v.cfg, v.facts, { tier: "audit" }).raw, 0);
});

test("tampered projections → 381 in audit tier only", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.projections = { ...v.bundle.projections, projection_root: "sha256:tampered" };
  assert.equal(vtcqVerify(v.bundle, v.cfg, v.facts, { tier: "audit" }).raw, 381);
  // public tier never runs projections → still raw 0
  assert.equal(vtcqVerify(v.bundle, v.cfg, v.facts, { tier: "public" }).raw, 0);
});

test("missing projections → 381 audit, 0 public", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.projections = null;
  assert.equal(vtcqVerify(v.bundle, v.cfg, v.facts, { tier: "audit" }).raw, 381);
  assert.equal(vtcqVerify(v.bundle, v.cfg, v.facts, { tier: "public" }).raw, 0);
});
