// Probe: Chaum-Pedersen DLEQ over Edwards25519 in PURE BigInt JS — zero deps.
// Question: can we pay the DLEQ debt with no library and no X25519 clamping trap?
import crypto from "node:crypto";

const P = 2n ** 255n - 19n; // field prime
const L = 2n ** 252n + 27742317777372353535851937790883648493n; // group order
function mod_(a, m) {
  return ((a % m) + m) % m;
}
function mod(a) {
  return mod_(a, P);
}
function inv(a) {
  return pow(mod(a), P - 2n);
}
function pow(b, e) {
  let r = 1n;
  b = mod(b);
  while (e > 0n) {
    if (e & 1n) r = mod(r * b);
    b = mod(b * b);
    e >>= 1n;
  }
  return r;
}
const D = mod(-121665n * inv(121666n)); // edwards d

// extended coords (X, Y, Z, T), neutral = (0,1,1,0)
const ID = [0n, 1n, 1n, 0n];
function add(p, q) {
  const [X1, Y1, Z1, T1] = p,
    [X2, Y2, Z2, T2] = q;
  const A = mod((Y1 - X1) * (Y2 - X2)),
    B = mod((Y1 + X1) * (Y2 + X2));
  const C = mod(2n * T1 * T2 * D),
    Dd = mod(2n * Z1 * Z2);
  const E = mod(B - A),
    F = mod(Dd - C),
    G = mod(Dd + C),
    H = mod(B + A);
  return [mod(E * F), mod(G * H), mod(F * G), mod(E * H)];
}
function mul(k, p) {
  let r = ID,
    q = p;
  k = mod_(k, L);
  while (k > 0n) {
    if (k & 1n) r = add(r, q);
    q = add(q, q);
    k >>= 1n;
  }
  return r;
}
function affine(p) {
  const zi = inv(p[2]);
  return [mod(p[0] * zi), mod(p[1] * zi)];
}
function eq(p, q) {
  const a = affine(p),
    b = affine(q);
  return a[0] === b[0] && a[1] === b[1];
}
function onCurve(p) {
  const [x, y] = affine(p);
  return mod(-x * x + y * y - 1n - D * x * x * y * y) === 0n;
}

// standard basepoint: y = 4/5
const By = mod(4n * inv(5n));
function recoverX(y, sign) {
  const y2 = mod(y * y);
  const x2 = mod((y2 - 1n) * inv(D * y2 + 1n));
  let x = pow(x2, (P + 3n) / 8n);
  if (mod(x * x) !== mod(x2)) x = mod(x * pow(2n, (P - 1n) / 4n));
  if (mod(x * x) !== mod(x2)) return null;
  if ((x & 1n) !== BigInt(sign)) x = mod(-x);
  return x;
}
const Bx = recoverX(By, 0);
const G = [Bx, By, 1n, mod(Bx * By)];

// sanity: basepoint on curve, has order L
console.log("G on curve:", onCurve(G));
console.log("L*G = identity:", eq(mul(L, G), ID));

// hash-to-point (try-and-increment on y, domain-separated) — epoch-bound class point
function hashToPoint(domain, epoch, label) {
  for (let ctr = 0; ctr < 256; ctr++) {
    const h = crypto.createHash("sha256").update(`${domain}|${epoch}|${label}|${ctr}`).digest();
    const y = mod(BigInt("0x" + h.toString("hex")));
    const x = recoverX(y, h[0] & 1);
    if (x === null) continue;
    let Pt = [x, y, 1n, mod(x * y)];
    Pt = mul(8n, Pt); // clear cofactor
    if (!eq(Pt, ID)) return Pt;
  }
  throw new Error("hash-to-point failed");
}
const rand = () => mod_(BigInt("0x" + crypto.randomBytes(48).toString("hex")), L);
const ser = (p) => {
  const [x, y] = affine(p);
  return x.toString(16) + ":" + y.toString(16);
};
const chal = (...pts) =>
  mod_(BigInt("0x" + crypto.createHash("sha512").update(pts.map(ser).join("|")).digest("hex")), L);

// Chaum-Pedersen DLEQ: prove log_G(A) == log_Hc(mA) without revealing a
function dleqProve(a, Hc) {
  const A = mul(a, G),
    mA = mul(a, Hc);
  const r = rand();
  const R1 = mul(r, G),
    R2 = mul(r, Hc);
  const c = chal(G, Hc, A, mA, R1, R2);
  const s = mod_(r + c * a, L);
  return { A, mA, R1, R2, s };
}
function dleqVerify({ A, mA, R1, R2, s }, Hc) {
  const c = chal(G, Hc, A, mA, R1, R2);
  return eq(mul(s, G), add(R1, mul(c, A))) && eq(mul(s, Hc), add(R2, mul(c, mA)));
}

const epoch = "sha256:4n-window-anchor-test";
const Hc = hashToPoint("simurgh.pccc.class.v2", epoch, "custody-class:deadbeef");
const a = rand(),
  b = rand();

const t0 = Date.now();
const proofA = dleqProve(a, Hc);
console.log("DLEQ honest proof verifies:", dleqVerify(proofA, Hc));

// forgery: claim mask was built with a, but it was built with b
const forged = { ...dleqProve(a, Hc), mA: mul(b, Hc) };
console.log("DLEQ forged mask rejected:", !dleqVerify(forged, Hc));

// the full match line, unilaterally checkable: zA = a*mB with the SAME a as epk_A
const mB = mul(b, Hc);
const zA = mul(a, mB);
const proofZ = (() => {
  const r = rand();
  return { R1: mul(r, G), R2: mul(r, mB), s: 0n, r };
})();
const cz = chal(G, mB, proofA.A, zA, proofZ.R1, proofZ.R2);
proofZ.s = mod_(proofZ.r + cz * a, L);
const okZ =
  eq(mul(proofZ.s, G), add(proofZ.R1, mul(cz, proofA.A))) &&
  eq(mul(proofZ.s, mB), add(proofZ.R2, mul(cz, zA)));
console.log("DLEQ over z-line (same a links epk and z):", okZ);
console.log("ms for 3 proofs + verifies:", Date.now() - t0);
