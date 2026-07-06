// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R Edwards25519 REFERENCE group (4R spec §3, §11). Motto: AnthropicSafe
// First, then ReviewerSafe. Pure BigInt, ZERO dependencies, deterministic. This
// is a research verifier group cross-validated against RFC 8032 test vectors and
// Node core Ed25519 (see the vector-gate test). It is NOT constant-time and NOT
// a production cryptographic deployment — rails
// `curve_arithmetic_is_reference_grade_not_constant_time` and
// `in_repo_curve_crypto_is_reference_verifier_not_production_deployment`.
import crypto from "node:crypto";

export const P = 2n ** 255n - 19n; // field prime 2^255 - 19
export const L = 2n ** 252n + 27742317777372353535851937790883648493n; // prime group order

function modP(a) {
  return ((a % P) + P) % P;
}
function modL(a) {
  return ((a % L) + L) % L;
}
function pow(b, e) {
  let r = 1n;
  b = modP(b);
  while (e > 0n) {
    if (e & 1n) r = modP(r * b);
    b = modP(b * b);
    e >>= 1n;
  }
  return r;
}
function inv(a) {
  return pow(modP(a), P - 2n);
}

const D = modP(-121665n * inv(121666n)); // Edwards curve constant d

// Extended twisted-Edwards coordinates (X, Y, Z, T); neutral element = (0,1,1,0).
export const ID = Object.freeze([0n, 1n, 1n, 0n]);

export function add(p, q) {
  const [X1, Y1, Z1, T1] = p;
  const [X2, Y2, Z2, T2] = q;
  const A = modP((Y1 - X1) * (Y2 - X2));
  const B = modP((Y1 + X1) * (Y2 + X2));
  const C = modP(2n * T1 * T2 * D);
  const Dd = modP(2n * Z1 * Z2);
  const E = modP(B - A);
  const F = modP(Dd - C);
  const G_ = modP(Dd + C);
  const H = modP(B + A);
  return [modP(E * F), modP(G_ * H), modP(F * G_), modP(E * H)];
}

export function mul(k, p) {
  let r = ID;
  let q = p;
  k = modL(k);
  while (k > 0n) {
    if (k & 1n) r = add(r, q);
    q = add(q, q);
    k >>= 1n;
  }
  return r;
}

export function affine(p) {
  const zi = inv(p[2]);
  return [modP(p[0] * zi), modP(p[1] * zi)];
}

export function eq(p, q) {
  const a = affine(p);
  const b = affine(q);
  return a[0] === b[0] && a[1] === b[1];
}

export function onCurve(p) {
  const [x, y] = affine(p);
  // -x^2 + y^2 = 1 + d x^2 y^2
  return modP(-x * x + y * y - 1n - D * x * x * y * y) === 0n;
}

// A point is small-order iff 8·P is the neutral element (covers all-zero /
// identity and the full 8-torsion). Prime-order points return false.
export function isSmallOrder(p) {
  return eq(mul(8n, p), ID);
}

// Standard basepoint: y = 4/5, x the even root.
const By = modP(4n * inv(5n));
function recoverX(y, sign) {
  const y2 = modP(y * y);
  const x2 = modP((y2 - 1n) * inv(D * y2 + 1n));
  let x = pow(x2, (P + 3n) / 8n);
  if (modP(x * x) !== modP(x2)) x = modP(x * pow(2n, (P - 1n) / 4n));
  if (modP(x * x) !== modP(x2)) return null;
  if ((x & 1n) !== BigInt(sign)) x = modP(-x);
  return x;
}
export const G = Object.freeze([recoverX(By, 0), By, 1n, modP(recoverX(By, 0) * By)]);

// RFC 8032 compressed encoding: y as 32 little-endian bytes, high bit of the
// last byte carries x parity. Returns 64 lowercase hex chars.
export function encodePoint(p) {
  const [x, y] = affine(p);
  const bytes = Buffer.alloc(32);
  let yy = y;
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number(yy & 0xffn);
    yy >>= 8n;
  }
  bytes[31] |= Number(x & 1n) << 7;
  return bytes.toString("hex");
}

export function decodePoint(hex) {
  if (typeof hex !== "string" || !/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("decodePoint: not 64 lowercase hex chars");
  }
  const bytes = Buffer.from(hex, "hex");
  const sign = (bytes[31] >> 7) & 1;
  const masked = Buffer.from(bytes);
  masked[31] &= 0x7f;
  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(masked[i]);
  if (y >= P) throw new Error("decodePoint: y out of field range");
  const x = recoverX(y, sign);
  if (x === null) throw new Error("decodePoint: point not on curve");
  const p = [x, y, 1n, modP(x * y)];
  if (!onCurve(p)) throw new Error("decodePoint: point not on curve");
  return p;
}

export function randomScalar() {
  // 48 random bytes reduced mod L: bias is < 2^-128, negligible for research use.
  return modL(BigInt("0x" + crypto.randomBytes(48).toString("hex")));
}

export function scalarToHex(k) {
  return modL(k).toString(16).padStart(64, "0");
}

export function scalarFromHex(hex) {
  if (typeof hex !== "string" || !/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("scalarFromHex: not 64 lowercase hex chars");
  }
  return modL(BigInt("0x" + hex));
}

// Domain-separated try-and-increment hash-to-point, cofactor-cleared into the
// prime-order subgroup. Ad-hoc (NOT RFC 9380) — rail
// `hash_to_group_is_ad_hoc_domain_separated_not_rfc9380`.
export function hashToPoint(cryptoDomain, epoch, label) {
  for (let ctr = 0; ctr < 256; ctr++) {
    const h = crypto
      .createHash("sha256")
      .update(`${cryptoDomain}|${epoch}|${label}|${ctr}`)
      .digest();
    const y = modP(BigInt("0x" + h.toString("hex")));
    const x = recoverX(y, h[0] & 1);
    if (x === null) continue;
    const pt = mul(8n, [x, y, 1n, modP(x * y)]); // clear cofactor
    if (!eq(pt, ID)) return pt;
  }
  throw new Error("hashToPoint: no candidate found in 256 counters");
}
