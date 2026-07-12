// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane A byte-stable evidence pack (plan Tasks 2.3/2.4). The committed pack verifies raw
// 0 through the real adapter, and the builder is byte-deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyVrc } from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";
import { verifyByteStability } from "../../../../tools/simurgh-attestation/stage5j/node/verify-byte-stability.mjs";
import { EVIDENCE_DIR } from "../../../../tools/simurgh-attestation/stage5j/node/build-vrc-evidence.mjs";

test("the committed Lane-A pack verifies raw 0 (public + audit)", () => {
  const bundle = JSON.parse(readFileSync(join(EVIDENCE_DIR, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(EVIDENCE_DIR, "external-config.json"), "utf8"));
  assert.equal(verifyVrc(bundle, cfg, { tier: "public" }).raw, 0);
  assert.equal(verifyVrc(bundle, cfg, { tier: "audit" }).raw, 0);
});

test("the public attestation carries not_verified + no projection_root; audit binds the public digest", () => {
  const pub = JSON.parse(readFileSync(join(EVIDENCE_DIR, "public-attestation.json"), "utf8"));
  const aud = JSON.parse(readFileSync(join(EVIDENCE_DIR, "audit-attestation.json"), "utf8"));
  assert.equal(pub.projection_status, "not_verified");
  assert.ok(!("projection_root" in pub));
  assert.equal(aud.tier, "audit");
  assert.ok(typeof aud.public_attestation_digest === "string");
});

test("the evidence builder is byte-deterministic (build twice, cmp)", () => {
  const { files } = verifyByteStability();
  assert.ok(files.length >= 4);
});
