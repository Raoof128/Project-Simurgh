# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5O §7.3.8 item 4 — Python cross-runtime parity for the Section 7 crypto surface.
#
# Stdlib only (hashlib, hmac, json, struct). Independently recomputes every cryptographic value that
# reaches a Section 7 verdict from the vector inputs and compares byte-for-byte to the Node reference.
# No expected digest is embedded; the reference file is the emitter's output. Exit 0 on full parity.
import hashlib
import hmac
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VECTORS = os.path.join(HERE, "..", "parity", "section7_parity_vectors.json")

fails = []


def check(name, got, want):
    if got != want:
        fails.append(f"{name}: got {got!r} != want {want!r}")


def canonical(value):
    return json.dumps(_sort(value), separators=(",", ":"), ensure_ascii=False)


def _sort(v):
    if isinstance(v, dict):
        return {k: _sort(v[k]) for k in sorted(v.keys())}
    if isinstance(v, list):
        return [_sort(x) for x in v]
    return v


def sha256(b):
    return hashlib.sha256(b).digest()


def dsha256(b):
    return sha256(sha256(b))


def hkdf_extract(salt, ikm):
    return hmac.new(salt, ikm, hashlib.sha256).digest()


def hkdf_expand(prk, info, length):
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:length]


def compact_target(nbits):
    exponent = nbits >> 24
    mantissa = nbits & 0x007FFFFF
    if nbits & 0x00800000:
        raise ValueError("negative_target")
    if exponent <= 3:
        return mantissa >> (8 * (3 - exponent))
    return mantissa << (8 * (exponent - 3))


def bit_length(n):
    return n.bit_length()


def framed(domain, body):
    d = domain.encode("utf-8")
    b = body.encode("utf-8")
    return len(d).to_bytes(2, "big") + d + len(b).to_bytes(4, "big") + b


def derive_indices(seed_hex, N, k, draw_ceiling, draw_domain):
    seed = bytes.fromhex(seed_hex)
    domain = draw_domain.encode("utf-8")
    b = bit_length(N - 1)
    mask = 0 if b == 0 else (1 << b) - 1
    accepted, seen, j = [], set(), 0
    while j < draw_ceiling and len(accepted) < k:
        draw = hkdf_expand(seed, domain + j.to_bytes(8, "big"), 32)
        candidate = int.from_bytes(draw, "big") & mask
        j += 1
        if candidate >= N or candidate in seen:
            continue
        seen.add(candidate)
        accepted.append(candidate)
    if len(accepted) < k:
        raise ValueError("draw_ceiling_exhausted")
    return sorted(accepted), j


def main():
    with open(VECTORS, "r", encoding="utf-8") as f:
        v = json.load(f)

    # canonical JSON
    for i, cv in enumerate(v["canonical_vectors"]):
        check(f"canonical[{i}]", canonical(cv["value"]), cv["canonical"])

    # registry: frame + hash each prepared descriptor
    for e in v["registry"]:
        digest = framed(e["domain"], canonical(e["prepared"]))
        check(f"registry[{e['id']}]", sha256(digest).hex(), e["digest"])

    # HKDF RFC vectors
    for r in v["hkdf_rfc"]:
        prk = hkdf_extract(bytes.fromhex(r["salt"]), bytes.fromhex(r["ikm"]))
        check(f"hkdf/{r['case']}/prk", prk.hex(), r["prk"])
        check(f"hkdf/{r['case']}/okm", hkdf_expand(prk, bytes.fromhex(r["info"]), r["L"]).hex(), r["okm"])

    # §7 seed derivation
    hs = v["hkdf_seed"]
    ikm = hs["seed_domain"].encode("utf-8") + bytes.fromhex(hs["subject_digest"]) + bytes.fromhex(hs["beacon_value"])
    seed = hkdf_extract(bytes.fromhex(hs["salt"]), ikm)
    check("hkdf_seed", seed.hex(), hs["seed"])

    # sampler
    s = v["sampler"]
    idx, draws = derive_indices(s["seed"], s["N"], s["k"], s["draw_ceiling"], s["draw_domain"])
    check("sampler/indices", idx, s["indices"])
    check("sampler/draws", draws, s["draws_used"])

    # checkpoint-instance digest
    ci = v["checkpoint_instance"]
    pre = ci["domain"].encode("utf-8") + bytes.fromhex(ci["pair18_digest"]) + canonical(ci["checkpoint"]).encode("utf-8")
    check("checkpoint_instance", sha256(pre).hex(), ci["digest"])

    # roots
    ra = v["root_artifacts"]
    for name in ["beacon_contract", "beacon_suffix", "ordered_selected_indices"]:
        check(f"root/{name}", sha256(canonical(ra[name]).encode("utf-8")).hex(), v["roots"][name])
    check("root/verified_closure_bitcoin_checkpoint", ci["digest"], v["roots"]["verified_closure_bitcoin_checkpoint"])

    # Bitcoin primitives
    for bh in v["bitcoin"]:
        raw = bytes.fromhex(bh["header"])
        internal = dsha256(raw)
        check(f"bitcoin[{bh['height']}]/internal", internal.hex(), bh["internal"])
        check(f"bitcoin[{bh['height']}]/display", internal[::-1].hex(), bh["display"])
        nbits = int.from_bytes(raw[72:76], "little")
        check(f"bitcoin[{bh['height']}]/nbits", nbits, bh["nbits_u32"])
        target = compact_target(nbits)
        check(f"bitcoin[{bh['height']}]/target", str(target), bh["target_decimal"])
        pow_ok = int.from_bytes(internal[::-1], "big") <= target
        check(f"bitcoin[{bh['height']}]/pow", pow_ok, bh["pow_ok"])

    # negatives (independently recomputed, not merely read back)
    import re

    neg = v["negatives"]
    upper_decodes = bool(re.fullmatch(r"[0-9a-f]{64}", "A" * 64))  # codec grammar: bare lowercase hex
    check("neg/uppercase_token", upper_decodes, neg["uppercase_token_decodes"])
    # one-bit seed mutation must change the indices (and match Node's mutated set)
    seed_bytes = bytearray(bytes.fromhex(hs["seed"]))
    seed_bytes[0] ^= 0x01
    mut_idx, _ = derive_indices(seed_bytes.hex(), s["N"], s["k"], s["draw_ceiling"], s["draw_domain"])
    check("neg/seed_mutation_indices", mut_idx, neg["one_bit_seed_mutation_indices"])
    if mut_idx == s["indices"]:
        fails.append("neg/seed_mutation: a one-bit seed flip did not change the indices")
    try:
        compact_target(0x00800000 | 0x1D00FFFF)
        got_throw = False
    except ValueError:
        got_throw = True
    check("neg/malformed_target_throws", got_throw, neg["malformed_compact_target_throws"])
    mn = v["bitcoin"][1]["header"][:152] + "deadbeef"
    raw = bytes.fromhex(mn)
    nbits = int.from_bytes(raw[72:76], "little")
    pow_ok = int.from_bytes(dsha256(raw)[::-1], "big") <= compact_target(nbits)
    check("neg/mutated_nonce_pow", pow_ok, neg["mutated_nonce_pow_ok"])

    if fails:
        print("PARITY FAIL (%d):" % len(fails))
        for f in fails:
            print("  " + f)
        sys.exit(1)
    print("Section 7 crypto parity: Python == Node (byte-for-byte). All vectors match.")


if __name__ == "__main__":
    main()
