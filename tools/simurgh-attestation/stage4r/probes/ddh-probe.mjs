import crypto from "node:crypto";

// hash arbitrary label to a candidate u-coordinate, import as X25519 public key (JWK OKP)
function hashToPoint(label) {
  const u = crypto.createHash("sha256").update(label).digest();
  return crypto.createPublicKey({
    key: { kty: "OKP", crv: "X25519", x: u.toString("base64url") },
    format: "jwk",
  });
}
function mask(privKey, pubKey) {
  const shared = crypto.diffieHellman({ privateKey: privKey, publicKey: pubKey });
  return shared; // 32 bytes = scalar·point u-coordinate
}
function rawToPub(buf) {
  return crypto.createPublicKey({
    key: { kty: "OKP", crv: "X25519", x: buf.toString("base64url") },
    format: "jwk",
  });
}

const a = crypto.generateKeyPairSync("x25519").privateKey;
const b = crypto.generateKeyPairSync("x25519").privateKey;

const P = hashToPoint("custody-class:relay_spki:deadbeef");
const aP = mask(a, P);
const b_aP = mask(b, rawToPub(aP));
const bP = mask(b, P);
const a_bP = mask(a, rawToPub(bP));

console.log("commutes:", b_aP.equals(a_bP));
// all-zero output = small-subgroup/twist degenerate point — must be rejected
console.log("nonzero:", !b_aP.every((x) => x === 0));
// determinism across processes is what PSI needs: same key+label -> same mask
console.log("deterministic:", mask(a, P).equals(mask(a, P)));
