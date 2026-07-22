// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.2 — RFC 5869 HKDF-SHA256 (frozen A25). Extract a pseudorandom key from non-uniform
// input material (the Bitcoin beacon), then expand it into context-bound per-draw outputs.
//
// This is the Node implementation (node:crypto HMAC); parity to a browser/Python surface is a
// separate lane. Correctness is pinned to RFC 5869 Appendix A vectors, never to our own arithmetic.
import { createHmac } from "node:crypto";

const HASH_LEN = 32; // SHA-256

function hmacSha256(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

/**
 * HKDF-Extract-SHA256. `salt` and `ikm` are Buffers. An empty salt is handled by HMAC's own key
 * zero-padding, matching RFC 5869's "HashLen zeros" rule.
 */
export function hkdfExtract(salt, ikm) {
  if (!Buffer.isBuffer(salt) || !Buffer.isBuffer(ikm)) {
    throw new TypeError("hkdf_extract_requires_buffers");
  }
  return hmacSha256(salt, ikm);
}

/** HKDF-Expand-SHA256. `prk`/`info` are Buffers; returns exactly `length` bytes. */
export function hkdfExpand(prk, info, length) {
  if (!Buffer.isBuffer(prk) || !Buffer.isBuffer(info)) {
    throw new TypeError("hkdf_expand_requires_buffers");
  }
  if (!Number.isInteger(length) || length < 0) throw new RangeError("hkdf_expand_length");
  const blocks = Math.ceil(length / HASH_LEN);
  if (blocks > 255) throw new RangeError("hkdf_expand_length_too_large");
  let t = Buffer.alloc(0);
  const chunks = [];
  for (let i = 1; i <= blocks; i++) {
    t = hmacSha256(prk, Buffer.concat([t, info, Buffer.from([i])]));
    chunks.push(t);
  }
  return Buffer.concat(chunks).subarray(0, length);
}
