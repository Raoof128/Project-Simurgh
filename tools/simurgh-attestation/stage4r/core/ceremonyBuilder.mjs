// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R ceremony builder (4R spec §3, §5). Motto: AnthropicSafe First, then
// ReviewerSafe. Constructs a complete four-phase ceremony (transcript + sealed
// packet + public record) from scalars/classes/keys, and reconstructs the
// evaluateCeremony input from serialized data so Lane A, Lane B, and the offline
// verifier all agree. The sealed packet carries per-operator epk + (synthetic)
// class digest for offline DLEQ verification — audit-tier material, NEVER the
// public bundle (spec §5.3 delta, enforced by the herd-token scan).
import crypto from "node:crypto";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS } from "../constants.mjs";
import { G, mul, encodePoint, decodePoint } from "./edwards25519.mjs";
import {
  classPoint,
  maskPoint,
  matchToken,
  pairId,
  pairIdHash,
  pairMatchCommitment,
  ephemeralPublicDigest,
} from "./maskCore.mjs";
import { dleqProve } from "./dleq.mjs";
import { tokenCommitment, maskDigest } from "./pcccCore.mjs";

const OTHER = { a: "b", b: "a" };
const DUMMY_DIGEST = "sha256:" + "0".repeat(64);

function signingDigest(transcript) {
  return recordDigest({ ...transcript, signatures: { a: "", b: "" } });
}

// Build a full ceremony for one class slot. `keys` are Ed25519 KeyObjects.
export function buildCeremony(cfg) {
  const { epoch, runId, slotIndex, classA, classB, scalarA, scalarB, keys, keyDigests, nonces } =
    cfg;
  const HcA = classPoint(epoch, classA);
  const HcB = classPoint(epoch, classB);
  const mA = maskPoint(scalarA, HcA);
  const mB = maskPoint(scalarB, HcB);
  const zA = maskPoint(scalarA, mB);
  const zB = maskPoint(scalarB, mA);
  const pid = pairId(epoch, keyDigests);
  const tokenA = matchToken(epoch, pid, zA);
  const tokenB = matchToken(epoch, pid, zB);
  const epk = { a: mul(scalarA, G), b: mul(scalarB, G) };
  const Hc = { a: HcA, b: HcB };
  const mask = { a: mA, b: mB };
  const z = { a: zA, b: zB };
  const scalar = { a: scalarA, b: scalarB };
  const cls = { a: classA, b: classB };
  const token = { a: tokenA, b: tokenB };

  const dleqFor = (role) => [
    dleqProve({
      scalar: scalar[role],
      basePoint: Hc[role],
      epk: epk[role],
      targetPoint: mask[role],
      relationKind: "mask",
      epoch,
      runId,
      pairId: pid,
      role,
    }),
    dleqProve({
      scalar: scalar[role],
      basePoint: mask[OTHER[role]],
      epk: epk[role],
      targetPoint: z[role],
      relationKind: "z",
      epoch,
      runId,
      pairId: pid,
      role,
    }),
  ];

  const transcript = {
    schema: SCHEMAS.MATCH_TRANSCRIPT,
    epoch,
    run_id: runId,
    pair_id: pid,
    slot_index: slotIndex,
    masks: { a: encodePoint(mA), b: encodePoint(mB) },
    commitments: {
      a: tokenCommitment({
        epoch,
        runId,
        pairId: pid,
        role: "a",
        peerMaskDigest: maskDigest(encodePoint(mB)),
        token: tokenA,
        tokenNonce: nonces.a,
      }),
      b: tokenCommitment({
        epoch,
        runId,
        pairId: pid,
        role: "b",
        peerMaskDigest: maskDigest(encodePoint(mA)),
        token: tokenB,
        tokenNonce: nonces.b,
      }),
    },
    openings: {
      a: { token: tokenA, token_nonce: nonces.a },
      b: { token: tokenB, token_nonce: nonces.b },
    },
    z: { a: encodePoint(zA), b: encodePoint(zB) },
    dleq: { a: dleqFor("a"), b: dleqFor("b") },
    phase_order: { a: ["mask", "commit", "open", "sign"], b: ["mask", "commit", "open", "sign"] },
    match: tokenA === tokenB,
    signatures: { a: "", b: "" },
  };
  const dig = signingDigest(transcript);
  transcript.signatures.a = crypto.sign(null, Buffer.from(dig), keys.a).toString("hex");
  transcript.signatures.b = crypto.sign(null, Buffer.from(dig), keys.b).toString("hex");

  const sealedPacket = {
    epoch,
    run_id: runId,
    pair_id: pid,
    slot_index: slotIndex,
    class_digests: { a: cls.a, b: cls.b },
    epk: { a: encodePoint(epk.a), b: encodePoint(epk.b) },
    ephemeral_digests: {
      a: ephemeralPublicDigest(epoch, "a", scalarA),
      b: ephemeralPublicDigest(epoch, "b", scalarB),
    },
  };

  const publicRecord = {
    schema: SCHEMAS.MATCH_RECORD,
    match: transcript.match,
    epoch,
    pair_id_hash: pairIdHash(pid),
    pair_match_commitment: pairMatchCommitment(
      epoch,
      pid,
      transcript.match,
      recordDigest(transcript)
    ),
    transcript_digest: recordDigest(transcript),
    vfr_receipt_digest: DUMMY_DIGEST,
    respondent_notice_hash: DUMMY_DIGEST,
    contest_pointer_hash: DUMMY_DIGEST,
    matched_against_operator_commitment: recordDigest({ pair_id_hash: pairIdHash(pid) }),
    contest_route_available: true,
    signatures: {
      a: transcript.signatures.a.slice(0, 16),
      b: transcript.signatures.b.slice(0, 16),
    },
  };

  return {
    transcript,
    sealedPacket,
    publicRecord,
    tokens: token,
    ephemeralDigests: sealedPacket.ephemeral_digests,
  };
}

// Reconstruct the evaluateCeremony input from serialized transcript + sealed
// packet + operator public keys, with optional overrides for tamper cases.
export function reconstructInput({ transcript, sealedPacket, operatorPublicKeys }, overrides = {}) {
  const HcA = classPoint(sealedPacket.epoch, sealedPacket.class_digests.a);
  const HcB = classPoint(sealedPacket.epoch, sealedPacket.class_digests.b);
  const epkA = decodePoint(sealedPacket.epk.a);
  const epkB = decodePoint(sealedPacket.epk.b);
  const mA = decodePoint(transcript.masks.a);
  const mB = decodePoint(transcript.masks.b);
  const zA = decodePoint(transcript.z.a);
  const zB = decodePoint(transcript.z.b);
  const sealedPoints = {
    a: {
      mask: { basePoint: HcA, epk: epkA, targetPoint: mA },
      z: { basePoint: mB, epk: epkA, targetPoint: zA },
    },
    b: {
      mask: { basePoint: HcB, epk: epkB, targetPoint: mB },
      z: { basePoint: mA, epk: epkB, targetPoint: zB },
    },
  };
  const verifySignature = (role, tr, sig) => {
    try {
      return crypto.verify(
        null,
        Buffer.from(signingDigest(tr)),
        operatorPublicKeys[role],
        Buffer.from(sig, "hex")
      );
    } catch {
      return false;
    }
  };
  const pid = transcript.pair_id;
  const recomputedTokens = {
    a: matchToken(transcript.epoch, pid, zA),
    b: matchToken(transcript.epoch, pid, zB),
  };
  return {
    transcript,
    verifySignature,
    sealedPoints,
    recomputedTokens,
    replay: { hit: false },
    reuse: { hit: false },
    herd: { hit: false },
    budgetExceeded: false,
    vfrOk: true,
    cardinality: { ok: true },
    ...overrides,
  };
}

export { signingDigest };
