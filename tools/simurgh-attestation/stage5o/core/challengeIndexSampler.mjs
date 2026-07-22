// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.2 — the frozen challenge-index rejection sampler (A25).
//
// Conditional on independent uniform draws, low-bit extraction + `candidate >= N` rejection is
// EXACTLY uniform, and per-draw duplicate rejection yields an exactly uniform ordered sample without
// replacement (A25's combinatorial layer). This module is the mechanism only; the draw domain and
// the ceilings are supplied by the caller from pair 22 / pair 23, so the sampler owns no literal.
//
// Extraction width: b = bitLength(N-1), the minimal width for which the low-b-bit + reject>=N rule is
// exactly uniform. (The byte-exact extraction rule is flagged for the §7 freeze review.)
import { hkdfExpand } from "./hkdf.mjs";

function bitLength(n) {
  let b = 0;
  while (n > 0) {
    n >>= 1;
    b++;
  }
  return b;
}

function u64be(j) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(j));
  return b;
}

/**
 * Replay the frozen sampler over a challenge seed.
 * @param {Buffer} seed  the HKDF-Extract PRK (challenge_seed), 32 bytes
 * @param {number} universeSize  N; indices are in [0, N)
 * @param {number} k  the number of distinct indices to draw
 * @param {number} drawCeiling  the maximum number of draws before failing (pair 23)
 * @param {string} drawDomain  UTF-8 domain for the per-draw info (pair 22)
 * @returns {{ indices: number[], sortedIndices: number[], drawsUsed: number }}
 */
export function deriveChallengeIndices({ seed, universeSize, k, drawCeiling, drawDomain }) {
  if (!Buffer.isBuffer(seed) || seed.length !== 32) throw new TypeError("sampler_seed");
  if (!Number.isSafeInteger(universeSize) || universeSize < 1) throw new RangeError("sampler_N");
  if (!Number.isSafeInteger(k) || k < 1 || k > universeSize) throw new RangeError("sampler_k");
  if (!Number.isSafeInteger(drawCeiling) || drawCeiling < 1)
    throw new RangeError("sampler_ceiling");
  if (typeof drawDomain !== "string" || drawDomain.length === 0) {
    throw new TypeError("sampler_draw_domain");
  }
  const domainBuf = Buffer.from(drawDomain, "utf8");
  const b = bitLength(universeSize - 1); // b = 0 when N === 1 (only index 0)
  const mask = (1n << BigInt(b)) - 1n;
  const accepted = [];
  const seen = new Set();
  let j = 0;
  for (; j < drawCeiling && accepted.length < k; j++) {
    const draw = hkdfExpand(seed, Buffer.concat([domainBuf, u64be(j)]), 32);
    const candidate = Number(BigInt("0x" + draw.toString("hex")) & mask);
    if (candidate >= universeSize) continue; // reject modulo-biased tail
    if (seen.has(candidate)) continue; // reject a duplicate accepted index
    seen.add(candidate);
    accepted.push(candidate);
  }
  if (accepted.length < k) throw new Error("sampler_draw_ceiling_exhausted");
  return Object.freeze({
    indices: accepted,
    sortedIndices: [...accepted].sort((x, y) => x - y),
    drawsUsed: j,
  });
}
