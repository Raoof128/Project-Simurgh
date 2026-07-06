# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4R PCCC parity kernel (4R spec §3, §9, §15). Motto: AnthropicSafe First,
# then ReviewerSafe. A pure-stdlib Python reimplementation of the Edwards25519
# reference group, hash-to-point, double-mask, match token, and DLEQ verify.
# Its job is to prove the JS core and this kernel agree BYTE-FOR-BYTE on tokens
# and verdicts (see tests/unit/llmShield/stage4r/parity.test.js). Reference
# research crypto, not production; not constant-time.
import hashlib
import json
import sys

P = 2**255 - 19
L = 2**252 + 27742317777372353535851937790883648493


def modp(a):
    return a % P


def inv(a):
    return pow(a % P, P - 2, P)


D = modp(-121665 * inv(121666))
ID = (0, 1, 1, 0)  # extended coords (X, Y, Z, T)


def add(p, q):
    X1, Y1, Z1, T1 = p
    X2, Y2, Z2, T2 = q
    A = modp((Y1 - X1) * (Y2 - X2))
    B = modp((Y1 + X1) * (Y2 + X2))
    C = modp(2 * T1 * T2 * D)
    Dd = modp(2 * Z1 * Z2)
    E, F, Gg, H = modp(B - A), modp(Dd - C), modp(Dd + C), modp(B + A)
    return (modp(E * F), modp(Gg * H), modp(F * Gg), modp(E * H))


def mul(k, p):
    r, q = ID, p
    k = k % L
    while k > 0:
        if k & 1:
            r = add(r, q)
        q = add(q, q)
        k >>= 1
    return r


def affine(p):
    zi = inv(p[2])
    return (modp(p[0] * zi), modp(p[1] * zi))


def eq(p, q):
    a, b = affine(p), affine(q)
    return a[0] == b[0] and a[1] == b[1]


def is_small_order(p):
    return eq(mul(8, p), ID)


def recover_x(y, sign):
    y2 = modp(y * y)
    x2 = modp((y2 - 1) * inv(D * y2 + 1))
    x = pow(x2, (P + 3) // 8, P)
    if modp(x * x) != modp(x2):
        x = modp(x * pow(2, (P - 1) // 4, P))
    if modp(x * x) != modp(x2):
        return None
    if (x & 1) != sign:
        x = modp(-x)
    return x


By = modp(4 * inv(5))
G = (recover_x(By, 0), By, 1, modp(recover_x(By, 0) * By))


def encode_point(p):
    x, y = affine(p)
    b = bytearray(y.to_bytes(32, "little"))
    b[31] |= (x & 1) << 7
    return b.hex()


def hash_to_point(domain, epoch, label):
    for ctr in range(256):
        h = hashlib.sha256(f"{domain}|{epoch}|{label}|{ctr}".encode()).digest()
        y = modp(int.from_bytes(h, "big"))
        x = recover_x(y, h[0] & 1)
        if x is None:
            continue
        pt = mul(8, (x, y, 1, modp(x * y)))
        if not eq(pt, ID):
            return pt
    raise ValueError("hash_to_point failed")


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(value):
    return "sha256:" + hashlib.sha256(canonical_json(value).encode()).hexdigest()


def pair_id(epoch, operator_key_digests):
    return record_digest(
        {
            "domain": "simurgh.pccc.pair.v1",
            "epoch": epoch,
            "operator_key_digests": sorted(operator_key_digests),
        }
    )


def match_token(epoch, pid, z_point):
    return record_digest(
        {
            "domain": "simurgh.pccc.match.v1",
            "epoch": epoch,
            "pair_id": pid,
            "z": encode_point(z_point),
        }
    )


def dleq_challenge(fields):
    h = hashlib.sha512(canonical_json(fields).encode()).digest()
    return int.from_bytes(h, "big") % L


def dleq_verify(proof, base, epk, target):
    if proof.get("schema") != "simurgh.pccc_dleq_proof.v1":
        return False
    if is_small_order(base) or is_small_order(epk) or is_small_order(target):
        return False
    R1 = decode_point(proof["R1"])
    R2 = decode_point(proof["R2"])
    s = int(proof["s"], 16) % L
    c = dleq_challenge(
        {
            "domain": "simurgh.pccc.dleq.v1",
            "relation_kind": proof["relation_kind"],
            "epoch": proof["epoch"],
            "run_id": proof["run_id"],
            "pair_id": proof["pair_id"],
            "role": proof["role"],
            "g": encode_point(G),
            "base": encode_point(base),
            "epk": encode_point(epk),
            "target": encode_point(target),
            "r1": encode_point(R1),
            "r2": encode_point(R2),
        }
    )
    return eq(mul(s, G), add(R1, mul(c, epk))) and eq(mul(s, base), add(R2, mul(c, target)))


def decode_point(hexstr):
    b = bytes.fromhex(hexstr)
    sign = (b[31] >> 7) & 1
    m = bytearray(b)
    m[31] &= 0x7F
    y = int.from_bytes(m, "little")
    x = recover_x(y, sign)
    if x is None:
        raise ValueError("not on curve")
    return (x, y, 1, modp(x * y))


def evaluate_case(case):
    epoch = case["epoch"]
    a = int(case["scalar_a"], 16)
    b = int(case["scalar_b"], 16)
    HcA = hash_to_point("simurgh.pccc.class.v1", epoch, case["class_a"])
    HcB = hash_to_point("simurgh.pccc.class.v1", epoch, case["class_b"])
    mA, mB = mul(a, HcA), mul(b, HcB)
    zA, zB = mul(a, mB), mul(b, mA)
    pid = pair_id(epoch, case["operator_key_digests"])
    token_a = match_token(epoch, pid, zA)
    token_b = match_token(epoch, pid, zB)
    match = token_a == token_b
    raw, reason = 0, "green"
    if "forged_dleq" in case:
        # verify a mask-relation proof against a deliberately wrong target
        fd = case["forged_dleq"]
        ok = dleq_verify(fd["proof"], HcA, mul(a, G), mul(int(fd["wrong_scalar"], 16), HcA))
        if not ok:
            raw, reason = 93, "dleq_z_proof_invalid"
    return {"name": case["name"], "token_a": token_a, "token_b": token_b, "match": match, "raw": raw, "reason": reason}


def main():
    if len(sys.argv) < 3 or sys.argv[1] != "verify":
        print("usage: pccc_kernel.py verify <corpus.json>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[2]) as fh:
        corpus = json.load(fh)
    for case in corpus["cases"]:
        print(json.dumps(evaluate_case(case), sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
