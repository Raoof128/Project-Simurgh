// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA — tensorCore (spec §2 deterministic surface, plan Task 3).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Pure numeric surface: float32-LE decode, fixed-order float64 dot, banker's rounding,
// nano-scaled decimal-STRING scores, BigInt comparison, salted tensor commitments.
// The decimal-string encoding exists because canonicalJson throws on BigInt and silently
// rounds a Number > 2^53 (plan gauntlet P0). No 4W/4X imports; sha over bytes only.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

// Decode a little-endian float32 byte tensor to an array of float64 (exact promotion).
// Rejects a non-multiple-of-4 length and any non-finite (NaN/±Inf) value — a non-finite
// score has no deterministic score_nano, so it is refused at the boundary (gauntlet-2 E).
export function decodeF32LE(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.length % 4 !== 0) throw new Error("f32_length_not_multiple_of_4");
  const out = [];
  for (let i = 0; i < buf.length; i += 4) {
    const v = buf.readFloatLE(i);
    if (!Number.isFinite(v)) throw new Error("non_finite_tensor");
    out.push(v);
  }
  return out;
}

// Fixed ascending-index float64 accumulation — the deterministic dot of record.
export function dotF64(a, b) {
  if (a.length !== b.length) throw new Error("dot_length_mismatch");
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc += a[i] * b[i];
  return acc;
}

// Custom half-to-even (banker's) rounding to an integer-valued Number. NOT Math.round
// (half-up) nor Python round() (also banker's but with float surprises) — one explicit
// algorithm, mirrored byte-for-byte in vwa_parity.py and the browser.
export function roundHalfEven(x) {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1; // exactly .5 → round to even
}

// score_nano = roundHalfEven(score * 1e9), serialized as a decimal STRING. Fail-closed on
// non-finite (no deterministic value) and on out-of-safe-range (above 2^53 the f64 ULP > 1,
// so the nano digits would be float-quantization artifacts, not real precision — gauntlet
// meaningfulness guard; determinism itself was proven JS==Python).
export function scoreNano(s) {
  if (!Number.isFinite(s)) throw new Error("non_finite_score");
  const r = roundHalfEven(s * 1e9);
  if (!Number.isSafeInteger(r)) throw new Error("score_nano_out_of_range");
  return BigInt(r).toString();
}

// Compare two decimal-string nano values by BigInt magnitude → -1 | 0 | 1. NEVER a lexical
// string compare ("9" > "10" is true lexically, false numerically).
export function cmpNano(a, b) {
  const x = BigInt(a);
  const y = BigInt(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

// "sha256:" + sha256(salt ‖ bytes) — audit-reopenable per-tensor commitment (CPC pattern).
export const tensorCommitment = (salt, bytes) =>
  "sha256:" +
  createHash("sha256")
    .update(Buffer.concat([Buffer.from(String(salt), "utf8"), Buffer.from(bytes)]))
    .digest("hex");

// Indexed commitment table keyed by a composite key (e.g. [prompt_id, ℓ, t] or [ℓ, k]);
// collisions are a bug, not a silent overwrite.
export function commitmentTable(entries) {
  const table = {};
  for (const { key, commitment } of entries) {
    const k = Array.isArray(key) ? key.join(":") : String(key);
    if (Object.prototype.hasOwnProperty.call(table, k))
      throw new Error("commitment_key_collision:" + k);
    table[k] = commitment;
  }
  return table;
}
