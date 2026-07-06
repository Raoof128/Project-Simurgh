// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { SCHEMAS } from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";
import { G, mul } from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";
import {
  classPoint,
  maskPoint,
  matchToken,
  pairId,
} from "../../../../tools/simurgh-attestation/stage4r/core/maskCore.mjs";
import { dleqProve } from "../../../../tools/simurgh-attestation/stage4r/core/dleq.mjs";
import {
  evaluateCeremony,
  tokenCommitment,
  maskDigest,
  GREEN,
} from "../../../../tools/simurgh-attestation/stage4r/core/pcccCore.mjs";
import { encodePoint } from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";

const EPOCH = "sha256:" + "a".repeat(64);
const CLASS = "sha256:" + "b".repeat(64);
const RUN = "run-golden";
const KEYDIG = { a: "sha256:" + "1".repeat(64), b: "sha256:" + "2".repeat(64) };

function signingDigest(t) {
  return recordDigest({ ...t, signatures: { a: "", b: "" } });
}

function buildGolden({ classA = CLASS, classB = CLASS } = {}) {
  const keys = {
    a: crypto.generateKeyPairSync("ed25519"),
    b: crypto.generateKeyPairSync("ed25519"),
  };
  const a = 424242n;
  const b = 636363n;
  const HcA = classPoint(EPOCH, classA);
  const HcB = classPoint(EPOCH, classB);
  const mA = maskPoint(a, HcA);
  const mB = maskPoint(b, HcB);
  const zA = maskPoint(a, mB); // a·(b·HcB)
  const zB = maskPoint(b, mA); // b·(a·HcA)
  const pid = pairId(EPOCH, [KEYDIG.a, KEYDIG.b]);
  const tokenA = matchToken(EPOCH, pid, zA);
  const tokenB = matchToken(EPOCH, pid, zB);
  const nonce = { a: "aa", b: "bb" };
  const mkDleq = (scalar, epk, role) => [
    dleqProve({
      scalar,
      basePoint: role === "a" ? HcA : HcB,
      epk,
      targetPoint: role === "a" ? mA : mB,
      relationKind: "mask",
      epoch: EPOCH,
      runId: RUN,
      pairId: pid,
      role,
    }),
    dleqProve({
      scalar,
      basePoint: role === "a" ? mB : mA,
      epk,
      targetPoint: role === "a" ? zA : zB,
      relationKind: "z",
      epoch: EPOCH,
      runId: RUN,
      pairId: pid,
      role,
    }),
  ];
  const t = {
    schema: SCHEMAS.MATCH_TRANSCRIPT,
    epoch: EPOCH,
    run_id: RUN,
    pair_id: pid,
    slot_index: 0,
    masks: { a: encodePoint(mA), b: encodePoint(mB) },
    commitments: {
      a: tokenCommitment({
        epoch: EPOCH,
        runId: RUN,
        pairId: pid,
        role: "a",
        peerMaskDigest: maskDigest(encodePoint(mB)),
        token: tokenA,
        tokenNonce: nonce.a,
      }),
      b: tokenCommitment({
        epoch: EPOCH,
        runId: RUN,
        pairId: pid,
        role: "b",
        peerMaskDigest: maskDigest(encodePoint(mA)),
        token: tokenB,
        tokenNonce: nonce.b,
      }),
    },
    openings: {
      a: { token: tokenA, token_nonce: nonce.a },
      b: { token: tokenB, token_nonce: nonce.b },
    },
    z: { a: encodePoint(zA), b: encodePoint(zB) },
    dleq: { a: mkDleq(a, mul(a, G), "a"), b: mkDleq(b, mul(b, G), "b") },
    phase_order: { a: ["mask", "commit", "open", "sign"], b: ["mask", "commit", "open", "sign"] },
    match: tokenA === tokenB,
    signatures: { a: "", b: "" },
  };
  const digest = signingDigest(t);
  t.signatures.a = crypto.sign(null, Buffer.from(digest), keys.a.privateKey).toString("hex");
  t.signatures.b = crypto.sign(null, Buffer.from(digest), keys.b.privateKey).toString("hex");

  const sealedPoints = {
    a: {
      mask: { basePoint: HcA, epk: mul(a, G), targetPoint: mA },
      z: { basePoint: mB, epk: mul(a, G), targetPoint: zA },
    },
    b: {
      mask: { basePoint: HcB, epk: mul(b, G), targetPoint: mB },
      z: { basePoint: mA, epk: mul(b, G), targetPoint: zB },
    },
  };
  const verifySignature = (role, tr, sig) => {
    try {
      return crypto.verify(
        null,
        Buffer.from(signingDigest(tr)),
        keys[role].publicKey,
        Buffer.from(sig, "hex")
      );
    } catch {
      return false;
    }
  };
  const input = {
    transcript: t,
    verifySignature,
    sealedPoints,
    recomputedTokens: { a: matchToken(EPOCH, pid, zA), b: matchToken(EPOCH, pid, zB) },
    replay: { hit: false },
    reuse: { hit: false },
    herd: { hit: false },
    budgetExceeded: false,
    vfrOk: true,
    cardinality: { ok: true },
  };
  return { input, t, keys };
}

test("golden honest MATCH ceremony evaluates GREEN", () => {
  const { input } = buildGolden();
  assert.deepEqual(evaluateCeremony(input), GREEN);
});

test("honest NON-MATCH ceremony evaluates GREEN", () => {
  const { input } = buildGolden({ classB: "sha256:" + "c".repeat(64) });
  assert.equal(input.transcript.match, false); // different class → tokens differ
  assert.deepEqual(evaluateCeremony(input), GREEN);
});

test("90: doubly-broken bundle surfaces as 90, never later codes (masking)", () => {
  const { input } = buildGolden();
  input.transcript.phase_order.a = ["commit", "mask", "open", "sign"]; // 90
  input.vfrOk = false; // would be 98 if reached
  const r = evaluateCeremony(input);
  assert.equal(r.raw, 90);
});

test("91: tampered signature", () => {
  const { input } = buildGolden();
  input.transcript.signatures.b = "00".repeat(64);
  assert.equal(evaluateCeremony(input).raw, 91);
});

test("token-copy liar is 90 opening-invalid; claim liar is 92 (commit-reveal payoff)", () => {
  // token-copy liar: on a non-match, b opens with a's token to fake agreement,
  // but b's commitment binds b's real token → opening recompute fails.
  const copy = buildGolden({ classB: "sha256:" + "e".repeat(64) });
  copy.input.transcript.openings.b.token = copy.input.transcript.openings.a.token;
  assert.deepEqual(evaluateCeremony(copy.input), {
    raw: 90,
    reason: "pccc_token_commitment_opening_invalid",
    green: false,
  });
  // claim liar: valid non-match transcript, but match flag flipped to true
  const claim = buildGolden({ classB: "sha256:" + "d".repeat(64) });
  claim.input.transcript.match = true;
  // re-sign so 91 passes and we reach 92
  const dig = signingDigest(claim.input.transcript);
  claim.input.transcript.signatures.a = crypto
    .sign(null, Buffer.from(dig), claim.keys.a.privateKey)
    .toString("hex");
  claim.input.transcript.signatures.b = crypto
    .sign(null, Buffer.from(dig), claim.keys.b.privateKey)
    .toString("hex");
  assert.equal(evaluateCeremony(claim.input).raw, 92);
});

test("93: forged DLEQ z-relation", () => {
  const { input } = buildGolden();
  input.sealedPoints.a.z.targetPoint = mul(999n, G); // proof no longer matches
  assert.deepEqual(evaluateCeremony(input), {
    raw: 93,
    reason: "dleq_z_proof_invalid",
    green: false,
  });
});

test("95 replay, 96 reuse, 97 budget, 98 vfr each fire in order", () => {
  let g = buildGolden();
  g.input.replay = { hit: true, reason: "cross_epoch_replay_detected" };
  assert.equal(evaluateCeremony(g.input).raw, 95);

  g = buildGolden();
  g.input.reuse = { hit: true, reason: "mask_reuse_detected" };
  assert.equal(evaluateCeremony(g.input).raw, 96);

  g = buildGolden();
  g.input.budgetExceeded = true;
  assert.equal(evaluateCeremony(g.input).raw, 97);

  g = buildGolden();
  g.input.vfrOk = false;
  assert.equal(evaluateCeremony(g.input).raw, 98);
});

test("99: public herd-token hit", () => {
  const { input } = buildGolden();
  input.herd = { hit: true };
  assert.equal(evaluateCeremony(input).raw, 99);
});
