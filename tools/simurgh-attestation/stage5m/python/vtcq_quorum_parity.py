#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5M — Python parity for the pure core (385-394 over injected facts) + an INDEPENDENT Lane-D adapter
# that consumes the raw frozen Rekor packet itself (hashlib + openssl subprocess; NO pip deps, NO network,
# never the Node facts/root/verdict). Decision-equivalence, not signature-identity.
import base64, hashlib, json, os, subprocess, sys, tempfile

# ---- pure core over injected facts (mirrors rekorSeat/crossSeat/state .mjs) ----
INCLUSION_DETAILS = {"inclusion_path_length_invalid", "inclusion_hash_malformed", "inclusion_root_mismatch", "log_index_out_of_range", "tree_size_invalid"}
CHECKPOINT_DETAILS = {"checkpoint_root_mismatch", "checkpoint_tree_size_mismatch", "checkpoint_signature_invalid", "checkpoint_note_malformed", "checkpoint_log_key_unpinned", "checkpoint_log_identity_mismatch"}
SUBMITTER_DETAILS = {"submitter_signature_invalid", "submitter_public_key_malformed", "submitter_key_algorithm_mismatch", "submitter_key_fingerprint_mismatch", "expected_submitter_key_binding_failed"}


def _bounded(s, v):
    return v if v in s else "unknown"


def rekor_seat_code(f):
    if f.get("seat_present") is False:
        return None
    rk = f.get("rekor")
    if not rk or rk.get("kind") != "hashedrekord":
        return (385, None)
    if rk.get("artifact_hash") != f.get("anchor_sha256"):
        return (386, None)
    if f.get("inclusion_ok") is False:
        return (387, _bounded(INCLUSION_DETAILS, f.get("inclusion_reason")))
    if f.get("checkpoint_ok") is False:
        return (388, _bounded(CHECKPOINT_DETAILS, f.get("checkpoint_reason")))
    if f.get("set_ok") is False:
        return (389, None)
    if f.get("submitter_ok") is False:
        return (390, _bounded(SUBMITTER_DETAILS, f.get("submitter_reason")))
    if f.get("entry_submitter_fpr") != f.get("expected_submitter_fpr"):
        return (390, "submitter_key_fingerprint_mismatch")
    return None


def cross_seat_code(f):
    if f.get("anchor_decoded") != f.get("commitment"):
        return 391
    if f.get("tsa_imprint") != f.get("commitment"):
        return 391
    if f.get("ots_leaf") != f.get("commitment"):
        return 391
    if f.get("seat_present") and f.get("rekor_artifact_hash") != f.get("anchor_sha256"):
        return 391
    return None


def distinct_code(f):
    c = f.get("present_valid_ecology_classes") or []
    return 392 if len(set(c)) < len(c) else None


def independence_number(f):
    return len(set(f.get("present_valid_ecology_classes") or []))


def computed_state(f):
    return "confirmed" if (f.get("seat_present") and independence_number(f) == 3) else "incomplete"


def outcome_class(f):
    if computed_state(f) == "confirmed":
        return "ecology_confirmed"
    return "false_anchored" if f.get("declared_externally_anchored") else "ecology_incomplete"


def extension_verdict(f):
    r = rekor_seat_code(f)
    if r is not None:
        return {"raw": r[0], "detail": r[1]}
    c = cross_seat_code(f)
    if c is not None:
        return {"raw": c}
    d = distinct_code(f)
    if d is not None:
        return {"raw": d}
    st = computed_state(f)
    if st == "incomplete" and f.get("declared_externally_anchored"):
        return {"raw": 394, "outcome_class": "false_anchored"}
    if st == "incomplete":
        return {"raw": 393, "outcome_class": "ecology_incomplete"}
    return {
        "raw": 0,
        "computed_ecology_state": "confirmed",
        "outcome_class": "ecology_confirmed",
        "ecology_independence_number": independence_number(f),
        "externally_anchored": True,
    }


# ---- INDEPENDENT Lane-D real crypto over the frozen packet ----
def _sha256(b):
    return hashlib.sha256(b).digest()


def _openssl_ecdsa(pub_pem, der_sig, msg):
    with tempfile.NamedTemporaryFile(delete=False) as sf, tempfile.NamedTemporaryFile(delete=False) as mf, tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as kf:
        sf.write(der_sig); mf.write(msg); kf.write(pub_pem.encode() if isinstance(pub_pem, str) else pub_pem)
        s, m, k = sf.name, mf.name, kf.name
    try:
        r = subprocess.run(["openssl", "dgst", "-sha256", "-verify", k, "-signature", s, m], capture_output=True, text=True)
        return r.returncode == 0 and "Verified OK" in r.stdout
    finally:
        for p in (s, m, k):
            os.unlink(p)


def _rfc6962_root(leaf, idx, size, proof):
    h, pi = leaf, 0
    while size > 1:
        if idx % 2 == 1:
            h = _sha256(b"\x01" + proof[pi] + h); pi += 1
        elif idx + 1 < size:
            h = _sha256(b"\x01" + h + proof[pi]); pi += 1
        idx //= 2
        size = (size + 1) // 2
    assert pi == len(proof)
    return h


def lane_d(ev_dir):
    full = json.load(open(os.path.join(ev_dir, "rekor_entry_full.json")))
    v = list(full.values())[0]
    ip = v["verification"]["inclusionProof"]
    rekor_pub = open(os.path.join(ev_dir, "rekor_pubkey.pem")).read()
    anchor = open(os.path.join(ev_dir, "canonical-anchor.txt"), "rb").read()
    # inclusion
    leaf = _sha256(b"\x00" + base64.b64decode(v["body"]))
    assert 0 <= ip["logIndex"] < ip["treeSize"]
    root = _rfc6962_root(leaf, ip["logIndex"], ip["treeSize"], [bytes.fromhex(x) for x in ip["hashes"]])
    inclusion_ok = root.hex() == ip["rootHash"]
    # checkpoint
    body, _, sigblk = ip["checkpoint"].partition("\n\n")
    lines = body.split("\n")
    ck_ok = int(lines[1]) == ip["treeSize"] and base64.b64decode(lines[2]).hex() == ip["rootHash"]
    sigline = [l for l in sigblk.split("\n") if l.startswith("— ")][0]
    ck_der = base64.b64decode(sigline.split(" ", 2)[2])[4:]
    ck_ok = ck_ok and _openssl_ecdsa(rekor_pub, ck_der, (body + "\n").encode())
    # SET
    canon = json.dumps({"body": v["body"], "integratedTime": v["integratedTime"], "logID": v["logID"], "logIndex": v["logIndex"]}, separators=(",", ":"), sort_keys=True).encode()
    set_ok = _openssl_ecdsa(rekor_pub, base64.b64decode(v["verification"]["signedEntryTimestamp"]), canon)
    # submitter
    entry_body = json.loads(base64.b64decode(v["body"]))
    sub_pub = base64.b64decode(entry_body["spec"]["signature"]["publicKey"]["content"])
    sub_sig = base64.b64decode(entry_body["spec"]["signature"]["content"])
    submitter_ok = _openssl_ecdsa(sub_pub.decode(), sub_sig, anchor)
    artifact_ok = entry_body["spec"]["data"]["hash"]["value"] == _sha256(anchor).hex()
    return {
        "lane": "D",
        "inclusion_ok": inclusion_ok,
        "checkpoint_ok": bool(ck_ok),
        "set_ok": set_ok,
        "submitter_ok": submitter_ok,
        "artifact_binds_anchor": artifact_ok,
        "shard_leaf_index": ip["logIndex"],
        "tree_size": ip["treeSize"],
        "root_hash": ip["rootHash"],
        "all_ok": all([inclusion_ok, ck_ok, set_ok, submitter_ok, artifact_ok]),
    }


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--facts":
        print(json.dumps(extension_verdict(json.loads(sys.argv[2])), sort_keys=True))
    elif len(sys.argv) >= 3 and sys.argv[1] == "--laned":
        print(json.dumps(lane_d(sys.argv[2]), sort_keys=True))
    else:
        print("usage: --facts <json> | --laned <evidence_dir>", file=sys.stderr)
        sys.exit(2)
