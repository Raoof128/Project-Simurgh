// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R Chaum-Pedersen DLEQ (4R spec §3.5, §11). Motto: AnthropicSafe First,
// then ReviewerSafe. Non-interactive via Fiat-Shamir (SHA-512 challenge, random
// oracle model — rail `dleq_is_fiat_shamir_random_oracle_model`). Proves
// log_G(epk) == log_base(target) without revealing the scalar: the operator's
// mask and z bind to the same ephemeral scalar as its epk.
import crypto from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { CRYPTO_DOMAINS, SCHEMAS } from "../constants.mjs";
import {
  G,
  L,
  add,
  mul,
  eq,
  encodePoint,
  decodePoint,
  isSmallOrder,
  randomScalar,
  scalarToHex,
  scalarFromHex,
} from "./edwards25519.mjs";

function challengeScalar({ relationKind, epoch, runId, pairId, role, base, epk, target, r1, r2 }) {
  const fields = {
    domain: CRYPTO_DOMAINS.DLEQ,
    relation_kind: relationKind,
    epoch,
    run_id: runId,
    pair_id: pairId,
    role,
    g: encodePoint(G),
    base: encodePoint(base),
    epk: encodePoint(epk),
    target: encodePoint(target),
    r1: encodePoint(r1),
    r2: encodePoint(r2),
  };
  const bytes = crypto.createHash("sha512").update(canonicalJson(fields)).digest();
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n % L;
}

// Prove log_G(epk) == log_base(target), witnessed by `scalar`.
export function dleqProve({
  scalar,
  basePoint,
  epk,
  targetPoint,
  relationKind,
  epoch,
  runId,
  pairId,
  role,
}) {
  const r = randomScalar();
  const R1 = mul(r, G);
  const R2 = mul(r, basePoint);
  const c = challengeScalar({
    relationKind,
    epoch,
    runId,
    pairId,
    role,
    base: basePoint,
    epk,
    target: targetPoint,
    r1: R1,
    r2: R2,
  });
  const s = (r + c * scalar) % L;
  return {
    schema: SCHEMAS.DLEQ_PROOF,
    relation_kind: relationKind,
    epoch,
    run_id: runId,
    pair_id: pairId,
    role,
    R1: encodePoint(R1),
    R2: encodePoint(R2),
    s: scalarToHex(s),
  };
}

// Verify a proof against the public points {basePoint, epk, targetPoint}. Any
// malformed field, degenerate point, or relation mismatch returns false.
export function dleqVerify(proof, { basePoint, epk, targetPoint }) {
  try {
    if (proof.schema !== SCHEMAS.DLEQ_PROOF) return false;
    if (isSmallOrder(basePoint) || isSmallOrder(epk) || isSmallOrder(targetPoint)) return false;
    const R1 = decodePoint(proof.R1);
    const R2 = decodePoint(proof.R2);
    const s = scalarFromHex(proof.s);
    const c = challengeScalar({
      relationKind: proof.relation_kind,
      epoch: proof.epoch,
      runId: proof.run_id,
      pairId: proof.pair_id,
      role: proof.role,
      base: basePoint,
      epk,
      target: targetPoint,
      r1: R1,
      r2: R2,
    });
    return (
      eq(mul(s, G), add(R1, mul(c, epk))) && eq(mul(s, basePoint), add(R2, mul(c, targetPoint)))
    );
  } catch {
    return false;
  }
}
