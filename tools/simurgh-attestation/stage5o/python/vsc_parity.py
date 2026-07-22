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


def merkle_leaf(v):
    return sha256(b"\x00" + v)


def merkle_node(left, right):
    return sha256(b"\x01" + left + right)


def largest_pow2_lt(n):
    k = 1
    while k * 2 < n:
        k *= 2
    return k


def mth(leaves):
    n = len(leaves)
    if n == 0:
        raise ValueError("empty")
    if n == 1:
        return merkle_leaf(leaves[0])
    k = largest_pow2_lt(n)
    return merkle_node(mth(leaves[:k]), mth(leaves[k:]))


def verify_inclusion(leaf, path, root):
    node = merkle_leaf(leaf)
    for step in path:
        sib = bytes.fromhex(step["sibling"])
        node = merkle_node(node, sib) if step["side"] == "right" else merkle_node(sib, node)
    return node == root


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


def _gcd(a, b):
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a


def _reduce(n, d):
    if d == 0:
        raise ValueError("zero denominator")
    if d < 0:
        n, d = -n, -d
    if n == 0:
        return (0, 1)
    g = _gcd(n, d)
    return (n // g, d // g)


def _rat(obj):
    return (int(obj["numerator"]), int(obj["denominator"]))


def _fmt(n, d):
    n, d = _reduce(n, d)
    return {"numerator": str(n), "denominator": str(d)}


def _product_qk(N, J, k):
    n, d = 1, 1
    for i in range(k):
        n *= N - J - i
        d *= N - i
    return _reduce(n, d)


def _product_qj(N, J, k):
    n, d = 1, 1
    for i in range(J):
        n *= N - k - i
        d *= N - i
    return _reduce(n, d)


def p_detect(N, J, k):
    """Exactly the frozen §9.3 rule: degenerate branch, then min(J,k) with the k == J tie on Q_k."""
    if N - J < k:
        return ((1, 1), "degenerate", 0)
    use_qk = k <= J
    q = _product_qk(N, J, k) if use_qk else _product_qj(N, J, k)
    val = _reduce(1 * q[1] - q[0] * 1, q[1])
    return (val, "Q_k" if use_qk else "Q_J", k if use_qk else J)


def p_pair(N, k):
    return _reduce(k * (k - 1), N * (N - 1))


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

    # Section 8 crypto surface
    s8 = v["section8"]
    dom = s8["domains"]
    cb = bytes.fromhex(s8["case"]["case_bytes_hex"])
    cd = sha256(dom["case_domain"].encode("utf-8") + len(cb).to_bytes(4, "big") + cb)
    check("s8/case_digest", cd.hex(), s8["case"]["case_digest"])
    lf = s8["leaf"]
    lid = sha256(
        dom["leaf_domain"].encode("utf-8")
        + bytes.fromhex(lf["epoch"])
        + int(lf["index"]).to_bytes(8, "big")
        + bytes.fromhex(lf["salt"])
        + cd
    )
    check("s8/leaf_id", lid.hex(), lf["leaf_id"])
    cl = s8["case_link"]
    link = sha256(
        dom["execution_case_link_domain"].encode("utf-8")
        + cd
        + bytes.fromhex(cl["execution_record_digest"])
    )
    check("s8/case_link", link.hex(), cl["commitment"])
    mk = s8["merkle"]
    leaves = [bytes.fromhex(x) for x in mk["leaves"]]
    check("s8/merkle_root", mth(leaves).hex(), mk["root"])
    check(
        "s8/merkle_inclusion",
        verify_inclusion(leaves[mk["index"]], mk["path"], bytes.fromhex(mk["root"])),
        True,
    )
    dp = s8["disclosure_policy"]
    dpd = sha256(dom["disclosure_policy_domain"].encode("utf-8") + canonical(dp["policy"]).encode("utf-8"))
    check("s8/disclosure_policy_digest", dpd.hex(), dp["digest"])

    # Section 9: EXACT RATIONAL ARITHMETIC. Prior lanes proved hashing agreed; this proves the
    # DECISIONS agree — the chosen product form, the term count, the reduced rational bytes, and the
    # floor verdict must all match Node and the browser exactly.
    s9 = v["section9"]
    for c in s9["detect"]:
        val, form, terms = p_detect(int(c["N"]), int(c["J"]), int(c["k"]))
        tag = "s9/detect/N=%s,J=%s,k=%s" % (c["N"], c["J"], c["k"])
        check(tag + "/form", form, c["form"])
        check(tag + "/terms", terms, c["terms"])
        check(tag + "/value", _fmt(val[0], val[1]), c["p_detect"])
        active = int(c["N"]) >= 2 and int(c["k"]) >= 2
        check(tag + "/pair_active", active, c["pair_ratio_active"])
        if active:
            pp = p_pair(int(c["N"]), int(c["k"]))
            check(tag + "/pair", _fmt(pp[0], pp[1]), c["p_pair"])
    for c in s9["j_star"]:
        a, b = _rat(c["f"])
        got = (a * int(c["N"]) + b - 1) // b
        check("s9/j_star/N=%s" % c["N"], str(got), c["j_star"])
    fl = s9["floor"]
    pn, pd = _rat(fl["p_detect"])
    en, ed = _rat(fl["p_min_equal"])
    an, ad = _rat(fl["p_min_above"])
    # the floor is decided by exact cross multiplication, never division
    check("s9/floor/equality_accepts", pn * ed >= en * pd, True)
    check("s9/floor/above_rejects", pn * ad >= an * pd, False)
    pol = s9["policy_digest"]
    pdg = sha256(s9["policy_domain"].encode("utf-8") + canonical(pol["policy"]).encode("utf-8"))
    check("s9/policy_digest", pdg.hex(), pol["digest"])

    if fails:
        print("PARITY FAIL (%d):" % len(fails))
        for f in fails:
            print("  " + f)
        sys.exit(1)
    print("Section 7/8/9 parity: Python == Node (byte-for-byte). All vectors match.")


if __name__ == "__main__":
    main()
