// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.8 item 4 — the BROWSER-PORTABLE Section 7 crypto surface.
//
// Uses ONLY browser-available primitives: the WHATWG WebCrypto SubtleCrypto API (globalThis.crypto,
// identical in a real browser and in Node 26), BigInt, TextEncoder, and pure JS. No node:crypto, no
// Buffer, no Node built-ins — so the exact same module reproduces every §7 cryptographic value under
// a strict no-egress CSP in a real browser and under Node's WebCrypto. All functions are async.
import { canonicalJson } from "./canonical-json.mjs";

const subtle = globalThis.crypto.subtle;
const utf8 = (s) => new TextEncoder().encode(s);

export function hexToBytes(h) {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}
export function bytesToHex(b) {
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return s;
}
function concat(...arrs) {
  const n = arrs.reduce((s, a) => s + a.length, 0);
  const o = new Uint8Array(n);
  let p = 0;
  for (const a of arrs) {
    o.set(a, p);
    p += a.length;
  }
  return o;
}
const u16be = (n) => new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
const u32be = (n) =>
  new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
const u64be = (n) => {
  const b = new Uint8Array(8);
  let bn = BigInt(n);
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(bn & 0xffn);
    bn >>= 8n;
  }
  return b;
};

export async function sha256(bytes) {
  return new Uint8Array(await subtle.digest("SHA-256", bytes));
}
export async function doubleSha256(bytes) {
  return sha256(await sha256(bytes));
}
async function hmac(key, data) {
  const k = await subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", k, data));
}
export async function hkdfExtract(salt, ikm) {
  return hmac(salt, ikm);
}
export async function hkdfExpand(prk, info, length) {
  const blocks = Math.ceil(length / 32);
  let t = new Uint8Array(0);
  const out = [];
  for (let i = 1; i <= blocks; i++) {
    t = await hmac(prk, concat(t, info, new Uint8Array([i])));
    out.push(t);
  }
  return concat(...out).slice(0, length);
}

/** The framed descriptor digest: SHA256(u16be(len(domain))||domain||u32be(len(body))||body). */
export async function framedDigestHex(domain, body) {
  const d = utf8(domain);
  const b = utf8(body);
  return bytesToHex(await sha256(concat(u16be(d.length), d, u32be(b.length), b)));
}
export async function registryDigestHex(domain, prepared) {
  return framedDigestHex(domain, canonicalJson(prepared));
}
/** The plain-concat checkpoint-instance digest: SHA256(domain||raw(pair18)||canonical(checkpoint)). */
export async function checkpointInstanceHex(domain, pair18DigestHex, checkpoint) {
  const pre = concat(utf8(domain), hexToBytes(pair18DigestHex), utf8(canonicalJson(checkpoint)));
  return bytesToHex(await sha256(pre));
}
export async function digestOfCanonicalHex(obj) {
  return bytesToHex(await sha256(utf8(canonicalJson(obj))));
}

export function compactTargetToBig(nBits) {
  const e = nBits >>> 24;
  const m = nBits & 0x007fffff;
  if (nBits & 0x00800000) throw new Error("negative_target");
  return e <= 3 ? BigInt(m) >> BigInt(8 * (3 - e)) : BigInt(m) << BigInt(8 * (e - 3));
}
export async function blockHashInternalHex(headerHex) {
  return bytesToHex(await doubleSha256(hexToBytes(headerHex)));
}
export async function blockHashDisplayHex(headerHex) {
  const b = await doubleSha256(hexToBytes(headerHex));
  return bytesToHex(b.slice().reverse());
}

function bitLength(n) {
  let b = 0;
  while (n > 0) {
    n >>= 1;
    b++;
  }
  return b;
}
export async function deriveIndices(seedHex, N, k, drawCeiling, drawDomain) {
  const seed = hexToBytes(seedHex);
  const dom = utf8(drawDomain);
  const b = bitLength(N - 1);
  const mask = (1n << BigInt(b)) - 1n;
  const acc = [];
  const seen = new Set();
  let j = 0;
  for (; j < drawCeiling && acc.length < k; j++) {
    const draw = await hkdfExpand(seed, concat(dom, u64be(j)), 32);
    const candidate = Number(BigInt("0x" + bytesToHex(draw)) & mask);
    if (candidate >= N || seen.has(candidate)) continue;
    seen.add(candidate);
    acc.push(candidate);
  }
  if (acc.length < k) throw new Error("draw_ceiling_exhausted");
  return { sorted: [...acc].sort((x, y) => x - y), draws: j };
}

// ---- Section 8 crypto surface (domains supplied by the caller; no literal owned here; u32be above).
export async function caseDigestHex(caseDomain, caseBytes) {
  return bytesToHex(await sha256(concat(utf8(caseDomain), u32be(caseBytes.length), caseBytes)));
}
export async function leafIdHex(leafDomain, epochBytes, index, saltBytes, caseDigestBytes) {
  return bytesToHex(
    await sha256(concat(utf8(leafDomain), epochBytes, u64be(index), saltBytes, caseDigestBytes))
  );
}
export async function caseLinkHex(linkDomain, caseDigestBytes, execBytes) {
  return bytesToHex(await sha256(concat(utf8(linkDomain), caseDigestBytes, execBytes)));
}
async function merkleLeafBytes(leaf) {
  return sha256(concat(new Uint8Array([0]), leaf));
}
async function merkleNodeBytes(l, r) {
  return sha256(concat(new Uint8Array([1]), l, r));
}
function largestPow2Lt(n) {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}
async function mthBytes(leaves) {
  if (leaves.length === 0) throw new Error("empty");
  if (leaves.length === 1) return merkleLeafBytes(leaves[0]);
  const k = largestPow2Lt(leaves.length);
  return merkleNodeBytes(await mthBytes(leaves.slice(0, k)), await mthBytes(leaves.slice(k)));
}
export async function mthHex(leavesHex) {
  return bytesToHex(await mthBytes(leavesHex.map(hexToBytes)));
}
export async function verifyInclusionHex(leafHex, path, rootHex) {
  let node = await merkleLeafBytes(hexToBytes(leafHex));
  for (const s of path) {
    const sib = hexToBytes(s.sibling);
    node = s.side === "right" ? await merkleNodeBytes(node, sib) : await merkleNodeBytes(sib, node);
  }
  return bytesToHex(node) === rootHex;
}
export async function disclosurePolicyDigestHex(policyDomain, policy) {
  return bytesToHex(await sha256(concat(utf8(policyDomain), utf8(canonicalJson(policy)))));
}

// ---- Section 9 exact rational arithmetic. Pure BigInt: no crypto, no float, and identical in a
// real browser and in Node. This is the stage's first ARITHMETIC parity surface — every earlier lane
// proved hashing agreed; these functions prove the DECISIONS agree.
function ratGcd(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}
export function ratReduce(n, d) {
  if (d === 0n) throw new Error("zero_denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  if (n === 0n) return { n: 0n, d: 1n };
  const g = ratGcd(n, d);
  return { n: n / g, d: d / g };
}
export function ratFormat({ n, d }) {
  const r = ratReduce(n, d);
  return { numerator: r.n.toString(10), denominator: r.d.toString(10) };
}
export function productQkPortable(N, J, k) {
  let n = 1n,
    d = 1n;
  for (let i = 0n; i < k; i++) {
    n *= N - J - i;
    d *= N - i;
  }
  return ratReduce(n, d);
}
export function productQJPortable(N, J, k) {
  let n = 1n,
    d = 1n;
  for (let i = 0n; i < J; i++) {
    n *= N - k - i;
    d *= N - i;
  }
  return ratReduce(n, d);
}
/** The frozen §9.3 rule: degenerate branch, then m = min(J,k) with the k == J tie pinned to Q_k. */
export function pDetectPortable(N, J, k) {
  if (N - J < k) return { value: { n: 1n, d: 1n }, form: "degenerate", terms: 0 };
  const useQk = k <= J;
  const q = useQk ? productQkPortable(N, J, k) : productQJPortable(N, J, k);
  return {
    value: ratReduce(q.d - q.n, q.d),
    form: useQk ? "Q_k" : "Q_J",
    terms: Number(useQk ? k : J),
  };
}
export function pPairPortable(N, k) {
  return ratReduce(k * (k - 1n), N * (N - 1n));
}
export function pairRatioActivePortable(N, k) {
  return N >= 2n && k >= 2n;
}
export function jStarPortable(f, N) {
  return (f.n * N + f.d - 1n) / f.d;
}
export async function probabilityPolicyDigestHex(policyDomain, policy) {
  return bytesToHex(await sha256(concat(utf8(policyDomain), utf8(canonicalJson(policy)))));
}
