// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — vncCore: schema (199), signature (200), frozen-order evaluateVnc, wrapper
// (209). Plan Task 9. Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateVnc,
  evaluateVncSafe,
} from "../../../../tools/simurgh-attestation/stage5a/core/vncCore.mjs";
import {
  buildGreenVncBundle,
  VNC_PUB,
  VWA_PUB,
} from "../../../../tools/simurgh-attestation/stage5a/node/greenBundle.mjs";

const clone = (b) => structuredClone(b);
const opts = { vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VWA_PUB };

test("green bundle verifies clean, both tiers; optional artifacts recorded absent", () => {
  const b = buildGreenVncBundle();
  const r = evaluateVnc(b, opts);
  assert.equal(r.raw, 0);
  assert.equal(r.rcp, "absent");
  assert.equal(r.pilot, "absent");
  assert.equal(evaluateVnc(b, { ...opts, tier: "audit" }).raw, 0);
});

test("199: a claim table carrying a forbidden map_digest field (structural Law 3, 199 not 202)", () => {
  const b = clone(buildGreenVncBundle());
  b.claim_table.content.map_digest = "sha256:" + "0".repeat(64);
  const r = evaluateVnc(b, opts);
  assert.equal(r.raw, 199);
  assert.equal(r.detail, "claim_table_forbidden_map_digest");
});

test("200: wrong VNC public key (key digest mismatch)", () => {
  const b = buildGreenVncBundle();
  const r = evaluateVnc(b, { vncPubKeyPem: VWA_PUB, vwaPubKeyPem: VWA_PUB });
  assert.equal(r.raw, 200);
});

test("200: a tampered attestation signature", () => {
  const b = clone(buildGreenVncBundle());
  b.attestation.signature = "00" + b.attestation.signature.slice(2);
  assert.equal(evaluateVnc(b, opts).raw, 200);
});

test("frozen order: 199 precedes 200 (schema before signature)", () => {
  const b = clone(buildGreenVncBundle());
  b.attestation.schema = "wrong"; // 199
  b.attestation.signature = "deadbeef"; // would be 200
  assert.equal(evaluateVnc(b, opts).raw, 199);
});

test("209: evaluateVncSafe fails closed on an unexpected throw", () => {
  const r = evaluateVncSafe(null, opts);
  assert.equal(r.raw, 209);
  assert.equal(r.reason, "internal_fail_closed_vnc");
});
