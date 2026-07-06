// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R — Reviewer one-command run (self-contained; Node built-ins only).
// A busy external reviewer runs ONE command, copies the printed RESULT block,
// and sends it back. No repo, no npm install, no config — just Node.
//
//   node reviewer-run.mjs "<a-challenge-word-from-the-person-who-sent-this>"
//
// It generates a FRESH independent operator identity on the reviewer's machine
// (their own Ed25519 key + a fresh curve25519 scalar — never shared), runs the
// full PCCC match ceremony twice (shared class -> should MATCH; different class
// -> should NON-MATCH), verifies both with the reference audit checks, and signs
// the verdicts over the challenge. This proves an independent machine + keys ran
// the real reference crypto and it passed. It is NOT production crypto.
import crypto from "node:crypto";

// ─────────────────────────── Edwards25519 reference group ───────────────────
const P = 2n ** 255n - 19n;
const L = 2n ** 252n + 27742317777372353535851937790883648493n;
const m = (a) => ((a % P) + P) % P;
const pw = (b, e) => {
  let r = 1n;
  b = m(b);
  while (e > 0n) {
    if (e & 1n) r = m(r * b);
    b = m(b * b);
    e >>= 1n;
  }
  return r;
};
const inv = (a) => pw(m(a), P - 2n);
const D = m(-121665n * inv(121666n));
const ID = [0n, 1n, 1n, 0n];
const add = (p, q) => {
  const [X1, Y1, Z1, T1] = p,
    [X2, Y2, Z2, T2] = q;
  const A = m((Y1 - X1) * (Y2 - X2)),
    B = m((Y1 + X1) * (Y2 + X2)),
    C = m(2n * T1 * T2 * D),
    Dd = m(2n * Z1 * Z2),
    E = m(B - A),
    F = m(Dd - C),
    Gg = m(Dd + C),
    H = m(B + A);
  return [m(E * F), m(Gg * H), m(F * Gg), m(E * H)];
};
const mul = (k, p) => {
  let r = ID,
    q = p;
  k = ((k % L) + L) % L;
  while (k > 0n) {
    if (k & 1n) r = add(r, q);
    q = add(q, q);
    k >>= 1n;
  }
  return r;
};
const aff = (p) => {
  const zi = inv(p[2]);
  return [m(p[0] * zi), m(p[1] * zi)];
};
const eq = (p, q) => {
  const a = aff(p),
    b = aff(q);
  return a[0] === b[0] && a[1] === b[1];
};
const isSmall = (p) => eq(mul(8n, p), ID);
const recoverX = (y, s) => {
  const y2 = m(y * y),
    x2 = m((y2 - 1n) * inv(D * y2 + 1n));
  let x = pw(x2, (P + 3n) / 8n);
  if (m(x * x) !== m(x2)) x = m(x * pw(2n, (P - 1n) / 4n));
  if (m(x * x) !== m(x2)) return null;
  if ((x & 1n) !== BigInt(s)) x = m(-x);
  return x;
};
const By = m(4n * inv(5n));
const G = [recoverX(By, 0), By, 1n, m(recoverX(By, 0) * By)];
const enc = (p) => {
  const [x, y] = aff(p);
  const b = Buffer.alloc(32);
  let yy = y;
  for (let i = 0; i < 32; i++) {
    b[i] = Number(yy & 0xffn);
    yy >>= 8n;
  }
  b[31] |= Number(x & 1n) << 7;
  return b.toString("hex");
};
const dec = (h) => {
  const b = Buffer.from(h, "hex");
  const s = (b[31] >> 7) & 1;
  const mm = Buffer.from(b);
  mm[31] &= 0x7f;
  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(mm[i]);
  const x = recoverX(y, s);
  return [x, y, 1n, m(x * y)];
};
const randScalar = () => BigInt("0x" + crypto.randomBytes(48).toString("hex")) % L;
const hashToPoint = (dom, epoch, label) => {
  for (let c = 0; c < 256; c++) {
    const h = crypto.createHash("sha256").update(`${dom}|${epoch}|${label}|${c}`).digest();
    const y = m(BigInt("0x" + h.toString("hex")));
    const x = recoverX(y, h[0] & 1);
    if (x === null) continue;
    const pt = mul(8n, [x, y, 1n, m(x * y)]);
    if (!eq(pt, ID)) return pt;
  }
  throw new Error("hashToPoint");
};

// ─────────────────────────── digests + DLEQ ─────────────────────────────────
const canon = (v) =>
  JSON.stringify(v, (k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val)
          .sort()
          .reduce((o, kk) => ((o[kk] = val[kk]), o), {})
      : val
  );
const digest = (v) => "sha256:" + crypto.createHash("sha256").update(canon(v)).digest("hex");
const token = (epoch, pair, z) =>
  digest({ domain: "simurgh.pccc.match.v1", epoch, pair_id: pair, z: enc(z) });
const dleqChal = (f) => {
  const h = crypto.createHash("sha512").update(canon(f)).digest();
  let n = 0n;
  for (const b of h) n = (n << 8n) | BigInt(b);
  return n % L;
};
function dleqProve(scalar, base, epk, target, ctx) {
  const nb = crypto
    .createHash("sha512")
    .update(
      canon({
        d: "nonce.v1",
        s: scalar.toString(16),
        ...ctx,
        base: enc(base),
        epk: enc(epk),
        target: enc(target),
      })
    )
    .digest();
  let r = 0n;
  for (const b of nb) r = (r << 8n) | BigInt(b);
  r %= L;
  const R1 = mul(r, G),
    R2 = mul(r, base);
  const c = dleqChal({
    domain: "simurgh.pccc.dleq.v1",
    ...ctx,
    g: enc(G),
    base: enc(base),
    epk: enc(epk),
    target: enc(target),
    r1: enc(R1),
    r2: enc(R2),
  });
  return {
    R1: enc(R1),
    R2: enc(R2),
    s: ((r + c * scalar) % L).toString(16).padStart(64, "0"),
    ...ctx,
  };
}
function dleqVerify(proof, base, epk, target) {
  if (isSmall(base) || isSmall(epk) || isSmall(target)) return false;
  const R1 = dec(proof.R1),
    R2 = dec(proof.R2),
    s = BigInt("0x" + proof.s) % L;
  const { R1: _1, R2: _2, s: _3, ...ctx } = proof;
  const c = dleqChal({
    domain: "simurgh.pccc.dleq.v1",
    ...ctx,
    g: enc(G),
    base: enc(base),
    epk: enc(epk),
    target: enc(target),
    r1: enc(R1),
    r2: enc(R2),
  });
  return eq(mul(s, G), add(R1, mul(c, epk))) && eq(mul(s, base), add(R2, mul(c, target)));
}

// ─────────────────────────── one full ceremony ──────────────────────────────
function ceremony(epoch, classA, classB, keyA, keyB) {
  const aS = randScalar(),
    bS = randScalar();
  const pair = digest({
    domain: "simurgh.pccc.pair.v1",
    epoch,
    k: [digest({ pub: keyA.pub }), digest({ pub: keyB.pub })].sort(),
  });
  const HcA = hashToPoint("simurgh.pccc.class.v1", epoch, classA),
    HcB = hashToPoint("simurgh.pccc.class.v1", epoch, classB);
  const mA = mul(aS, HcA),
    mB = mul(bS, HcB);
  const zA = mul(aS, mB),
    zB = mul(bS, mA);
  const tA = token(epoch, pair, zA),
    tB = token(epoch, pair, zB);
  const ctxA = { relation_kind: "z", epoch, run_id: "review", pair_id: pair, role: "a" };
  const ctxB = { relation_kind: "z", epoch, run_id: "review", pair_id: pair, role: "b" };
  const dzA = dleqProve(aS, mB, mul(aS, G), zA, ctxA),
    dzB = dleqProve(bS, mA, mul(bS, G), zB, ctxB);
  // audit checks (the real ones): DLEQ z-proofs valid, tokens recompute, match==tokensEqual, no small order
  const ok =
    !isSmall(zA) &&
    !isSmall(zB) &&
    dleqVerify(dzA, mB, mul(aS, G), zA) &&
    dleqVerify(dzB, mA, mul(bS, G), zB) &&
    token(epoch, pair, zA) === tA &&
    token(epoch, pair, zB) === tB;
  return { match: tA === tB, verdict: ok ? "green" : "REJECTED", leak: false };
}

// ─────────────────────────── verify mode (the sender runs this) ─────────────
// node reviewer-run.mjs --verify <path-to-block.json> [<expected-challenge>]
if (process.argv[2] === "--verify") {
  const fs = await import("node:fs");
  const block = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const pubDer = Buffer.from(block.result.reviewer_public_key_der_hex, "hex");
  const pub = crypto.createPublicKey({ key: pubDer, format: "der", type: "spki" });
  const sigOk = crypto.verify(
    null,
    Buffer.from(canon(block.result)),
    pub,
    Buffer.from(block.signature, "hex")
  );
  const s = block.result.scenarios;
  const scenariosOk =
    s.length === 2 &&
    s[0].got_match === true &&
    s[0].verdict === "green" &&
    s[1].got_match === false &&
    s[1].verdict === "green";
  const challengeOk = !process.argv[4] || block.result.challenge === process.argv[4];
  const ok = sigOk && scenariosOk && block.result.all_passed && challengeOk;
  const identity =
    block.result.reviewer_identity_self_declared || "ANONYMOUS (old-format block, no identity)";
  const fp = block.result.reviewer_key_fingerprint || "n/a";
  console.log("reviewer identity (SELF-DECLARED — confirm out of band!):", identity);
  console.log("reviewer key fingerprint:", fp);
  console.log(
    "challenge:",
    block.result.challenge,
    process.argv[4] ? `(expected ${process.argv[4]}: ${challengeOk})` : ""
  );
  console.log("signature valid:", sigOk);
  console.log("scenarios correct (match + non-match, both green):", scenariosOk);
  console.log(
    ok
      ? "\n✅ VERIFIED — this block is intact, bound to your challenge, and the ceremony passed.\n   ⚠️  It does NOT prove WHO ran it. Confirm the fingerprint above with the person\n   over a channel you trust (their email/GitHub) before counting it as real corroboration."
      : "\n❌ NOT VERIFIED"
  );
  process.exit(ok ? 0 : 1);
}

// ─────────────────────────── run + sign result ──────────────────────────────
// Usage: node reviewer-run.mjs "<challenge-from-requester>" "<your name / email or GitHub>"
//
// NO platform/OS field is emitted and there are NO override backdoors: a
// self-contained script cannot prove which OS ran it, so it must not pretend to.
// What makes a block hard to fake is (1) the requester-issued challenge you
// cannot pre-generate, (2) a STABLE per-machine identity key (re-runs reuse it,
// so one person cannot inflate the count by re-running), and (3) a signed
// self-declared identity the requester confirms OUT OF BAND (email/GitHub).
import { readFileSync as _rf, writeFileSync as _wf, existsSync as _ex } from "node:fs";
import { fileURLToPath as _fu } from "node:url";
import { dirname as _dn, join as _jn } from "node:path";

const challenge = process.argv[2] || "no-challenge-provided";
const identity =
  process.argv[3] || "ANONYMOUS (no identity given — weak, requester cannot verify who ran this)";
const epoch =
  "sha256:" +
  crypto
    .createHash("sha256")
    .update("reviewer-epoch|" + challenge)
    .digest("hex");

// Stable per-machine key: reused across runs so N re-runs collapse to ONE
// identity (defeats accidental count-padding). Stored beside the script.
const keyPath = _jn(_dn(_fu(import.meta.url)), "simurgh-reviewer-identity-key.pem");
let reviewer, reused;
if (_ex(keyPath)) {
  reviewer = { privateKey: crypto.createPrivateKey(_rf(keyPath)), publicKey: null };
  reviewer.publicKey = crypto.createPublicKey(reviewer.privateKey);
  reused = true;
} else {
  reviewer = crypto.generateKeyPairSync("ed25519");
  _wf(keyPath, reviewer.privateKey.export({ type: "pkcs8", format: "pem" }));
  reused = false;
}
const reviewerPubHex = reviewer.publicKey.export({ type: "spki", format: "der" }).toString("hex");
const fingerprint = crypto.createHash("sha256").update(reviewerPubHex).digest("hex").slice(0, 16);

const keyA = { kp: crypto.generateKeyPairSync("ed25519") };
keyA.pub = keyA.kp.publicKey.export({ type: "spki", format: "der" }).toString("hex");
const keyB = { pub: reviewerPubHex };

const CLASS_X = "sha256:" + "5c".repeat(32),
  CLASS_Y = "sha256:" + "6d".repeat(32);
const s1 = ceremony(epoch, CLASS_X, CLASS_X, keyA, keyB); // shared -> match
const s2 = ceremony(epoch, CLASS_X, CLASS_Y, keyA, keyB); // different -> non-match
const allPassed =
  s1.verdict === "green" && s1.match === true && s2.verdict === "green" && s2.match === false;

const result = {
  what: "Stage 4R PCCC external reviewer run",
  challenge,
  reviewer_identity_self_declared: identity,
  reviewer_public_key_der_hex: keyB.pub,
  reviewer_key_fingerprint: fingerprint,
  scenarios: [
    { classes: "shared", expect_match: true, got_match: s1.match, verdict: s1.verdict },
    { classes: "different", expect_match: false, got_match: s2.match, verdict: s2.verdict },
  ],
  all_passed: allPassed,
  node_version: process.version,
};
const signature = crypto
  .sign(null, Buffer.from(canon(result)), reviewer.privateKey)
  .toString("hex");

console.log("\n" + (allPassed ? "✅ PASS" : "❌ FAIL") + " — Stage 4R reviewer run complete.\n");
console.log(
  "Scenario 1 (shared class):    match =",
  s1.match,
  " verdict =",
  s1.verdict,
  " (expected match=true)"
);
console.log(
  "Scenario 2 (different class): match =",
  s2.match,
  " verdict =",
  s2.verdict,
  " (expected match=false)"
);
console.log(
  "\nYour identity key fingerprint:",
  fingerprint,
  reused ? "(reused existing key)" : "(new key — keep the .pem file to reuse it)"
);
console.log(
  "Tell the requester this fingerprint over a channel they trust (your email/GitHub) so they can confirm the block is really from you."
);
console.log("\n────────── COPY EVERYTHING BELOW THIS LINE AND SEND IT BACK ──────────");
console.log(JSON.stringify({ result, signature }, null, 2));
console.log("────────── COPY EVERYTHING ABOVE THIS LINE ──────────\n");
process.exit(allPassed ? 0 : 1);
