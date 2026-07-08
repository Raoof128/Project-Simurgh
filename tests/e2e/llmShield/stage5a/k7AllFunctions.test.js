// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — K7 all-functions net (plan Task 15). Exercises every stage5a export, the full
// tamper matrix at both tiers, and the cross-stage invariants that tie 5A to 4W/4Z and the
// Lean locks. MANDATORY before tag. Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VNC_RAW_CODES,
  VNC_CHECK_ORDER,
  VNC_PUBLIC_CODES,
  VNC_AUDIT_CODES,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import * as constants from "../../../../tools/simurgh-attestation/stage5a/constants.mjs";
import * as claimCore from "../../../../tools/simurgh-attestation/stage5a/core/claimCore.mjs";
import * as verdictCore from "../../../../tools/simurgh-attestation/stage5a/core/verdictCore.mjs";
import * as partitionCore from "../../../../tools/simurgh-attestation/stage5a/core/partitionCore.mjs";
import * as bindingCore from "../../../../tools/simurgh-attestation/stage5a/core/bindingCore.mjs";
import * as manifestCore from "../../../../tools/simurgh-attestation/stage5a/core/manifestCore.mjs";
import * as adapterCore from "../../../../tools/simurgh-attestation/stage5a/core/adapterCore.mjs";
import * as vncCore from "../../../../tools/simurgh-attestation/stage5a/core/vncCore.mjs";
import { evaluateVnc } from "../../../../tools/simurgh-attestation/stage5a/core/vncCore.mjs";
import { buildFixtures } from "../../../../tools/simurgh-attestation/stage5a/node/build-stage5a-fixtures.mjs";
import {
  buildGreenVncBundle,
  VNC_PUB,
  VWA_PUB,
} from "../../../../tools/simurgh-attestation/stage5a/node/greenBundle.mjs";

const keys = { vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VWA_PUB };

test("K7.1 every core module exports its documented surface (no silent drop)", () => {
  const expect = {
    claimCore: ["claimTableDigest", "resolveSpan", "checkClaimTable"],
    verdictCore: [
      "parseTokenId",
      "cmpAddr",
      "flagRelation",
      "declaredLexicon",
      "hitsFor",
      "verdictFor",
      "classify",
      "checkClassification",
      "checkVerdicts",
    ],
    partitionCore: [
      "partitionFlags",
      "computeUnnarrated",
      "checkCoverage",
      "tallies",
      "checkTallies",
    ],
    bindingCore: ["checkBindings"],
    manifestCore: ["manifestRoot", "inclusionProof", "verifyInclusion", "checkManifest"],
    adapterCore: ["checkAdaptation"],
    vncCore: [
      "signArtifact",
      "verifyArtifactSignature",
      "attestationBody",
      "signVncAttestation",
      "evaluateVnc",
      "evaluateVncSafe",
    ],
  };
  const mods = {
    claimCore,
    verdictCore,
    partitionCore,
    bindingCore,
    manifestCore,
    adapterCore,
    vncCore,
  };
  for (const [name, fns] of Object.entries(expect))
    for (const fn of fns) assert.equal(typeof mods[name][fn], "function", `${name}.${fn}`);
});

test("K7.2 the full tamper matrix reaches its target code at BOTH tiers", () => {
  for (const fx of buildFixtures()) {
    assert.equal(evaluateVnc(fx.bundle, { ...keys, tier: "public" }).raw, fx.public_raw, fx.id);
    assert.equal(evaluateVnc(fx.bundle, { ...keys, tier: "audit" }).raw, fx.audit_raw, fx.id);
  }
});

test("K7.3 cross-stage invariant: a claim table can never carry a map_digest (Law 3, 199)", () => {
  const b = structuredClone(buildGreenVncBundle());
  b.claim_table.content.map_digest = "sha256:" + "0".repeat(64);
  assert.equal(evaluateVnc(b, keys).raw, 199);
});

test("K7.4 cross-stage invariant: the embedded 4Z map is verified, not trusted (201)", () => {
  const b = buildGreenVncBundle();
  assert.equal(evaluateVnc(b, { vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VNC_PUB }).raw, 201);
});

test("K7.5 ledger arithmetic: pays 3, mints 1, reserved 6 (net debt -2)", () => {
  assert.equal(constants.VNC_PAID_SLOTS.length, 3);
  assert.equal(constants.VNC_MINTED_SLOTS.length, 1);
  assert.equal(constants.VNC_RESERVED_SLOTS.length, 6);
  for (const p of constants.VNC_PAID_SLOTS) assert.ok(!constants.VNC_RESERVED_SLOTS.includes(p));
});

test("K7.6 Lean-shadow: VNC_PUBLIC_CODES ⊆ VNC_AUDIT_CODES; check order excludes the wrapper", () => {
  for (const c of VNC_PUBLIC_CODES) assert.ok(VNC_AUDIT_CODES.includes(c));
  assert.ok(!VNC_CHECK_ORDER.includes(VNC_RAW_CODES.INTERNAL_FAIL_CLOSED_VNC));
  assert.equal(VNC_RAW_CODES.INTERNAL_FAIL_CLOSED_VNC, 209);
});

test("K7.7 Lean-shadow: conflictAntitone — adding flags never launders a contradiction", () => {
  const c = {
    claim_id: "c1",
    span_ref: { span_id: "s", start_byte: 0, end_byte: 1 },
    token_ids: ["1001"],
    polarity: "asserts_unflagged",
  };
  const cell = (flags) => ({
    prompt_id: "p1",
    t: 0,
    layer: 2,
    scores: [{ token_id: 1001, score_nano: "0" }],
    flags,
  });
  assert.equal(verdictCore.verdictFor(c, { cells: [cell([1001])] }).verdict, "contradicted");
  assert.equal(verdictCore.verdictFor(c, { cells: [cell([1001, 1001])] }).verdict, "contradicted");
});
