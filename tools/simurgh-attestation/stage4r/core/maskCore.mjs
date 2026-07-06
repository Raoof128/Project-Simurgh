// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R double-mask core (4R spec §3.1, §3.4). Motto: AnthropicSafe First,
// then ReviewerSafe. Pure functions over the reference group; all digests via
// the stage4m canonical helper. Raw values (points, z) are hex; the callers
// keep raw material out of the public bundle (spec §5.2).
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { CRYPTO_DOMAINS } from "../constants.mjs";
import { G, mul, encodePoint, isSmallOrder, hashToPoint } from "./edwards25519.mjs";

// Thrown when a masked point is small-order / identity (feeds raw 94).
export const SMALL_ORDER = "small_order_or_all_zero";
export class SmallOrderError extends Error {
  constructor(message = "masked point is small-order or all-zero") {
    super(message);
    this.name = "SmallOrderError";
    this.code = SMALL_ORDER;
  }
}

// Hc = hashToPoint("simurgh.pccc.class.v1", epoch, custody_class_digest).
export function classPoint(epoch, custodyClassDigest) {
  return hashToPoint(CRYPTO_DOMAINS.CLASS, epoch, custodyClassDigest);
}

// One masking step: scalar · point, fail-closed if the result is degenerate.
export function maskPoint(scalar, point) {
  const out = mul(scalar, point);
  if (isSmallOrder(out)) throw new SmallOrderError();
  return out;
}

// token = H("simurgh.pccc.match.v1", epoch, pair_id, z) — the value compared for
// a match. z is the doubly-masked point (encoded), never published raw.
export function matchToken(epoch, pairId, zPoint) {
  return recordDigest({
    domain: CRYPTO_DOMAINS.MATCH,
    epoch,
    pair_id: pairId,
    z: encodePoint(zPoint),
  });
}

// pair_id = H("simurgh.pccc.pair.v1", epoch, sorted_operator_key_digests).
export function pairId(epoch, operatorKeyDigests) {
  return recordDigest({
    domain: CRYPTO_DOMAINS.PAIR,
    epoch,
    operator_key_digests: [...operatorKeyDigests].sort(),
  });
}

// Public linkless identifier: H(pair_id). pair_id itself sits in the token
// domain and stays out of the public bundle (spec §3.4, §5.2).
export function pairIdHash(pairIdValue) {
  return recordDigest({ domain: "SIMURGH_STAGE4R_PAIR_ID_HASH_V1", pair_id: pairIdValue });
}

// pair_match_commitment = H("simurgh.pccc.match_commit.v1", epoch, pair_id,
// match, transcript_digest).
export function pairMatchCommitment(epoch, pairIdValue, match, transcriptDigest) {
  return recordDigest({
    domain: CRYPTO_DOMAINS.MATCH_COMMIT,
    epoch,
    pair_id: pairIdValue,
    match,
    transcript_digest: transcriptDigest,
  });
}

// ephemeral_scalar_public_digest = H("simurgh.pccc.ephemeral_pub.v1", epoch,
// role, encode(scalar·G)) — verifier-only sealed-packet material (spec §3.4).
export function ephemeralPublicDigest(epoch, role, scalar) {
  return recordDigest({
    domain: CRYPTO_DOMAINS.EPHEMERAL_PUB,
    epoch,
    role,
    epk: encodePoint(mul(scalar, G)),
  });
}
