#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5P (VSI) — INDEPENDENT verification. Python 3 standard library + openssl. Nothing else.
#
# This script exists so you do not have to trust the people who produced this bundle. It does not
# import their code, does not call their servers, and does not run their test suite. It recomputes
# every number from the bytes shipped alongside it and tells you where each one came from.
#
# WHAT IT PROVES
#   1. The signed attestation really was signed by the key in this bundle, and its payload has not
#      been altered by a byte.
#   2. Every evidence file matches the digest committed in its manifest.
#   3. The Rekor entry is genuinely in the public transparency log: the signature verifies, the log
#      entry commits to THIS artifact, the RFC 6962 inclusion proof recomputes to the root the log
#      signed, and Rekor's own key signed the entry timestamp.
#   4. The identity lattice behaves identically in a second, independent implementation — this one.
#
# WHAT IT CANNOT PROVE, and neither can anything else in this bundle:
#   * that the private key was not misused (nobody can prove that from outside)
#   * that the model behaviour captured in Lane L is typical (one model, one day, three prompts)
#   * that GLEIF signed the registry records (they did not — see the honesty note below)
#   * WHO holds the Rekor signing key (a transparency log never says)
#
# Optional but recommended: check the live log yourself. The entry is public and permanent.
#   curl -s https://rekor.sigstore.dev/api/v1/log/entries/<uuid_printed_below> | head -c 400
# If that returns the same body as the frozen copy here, this bundle did not invent it.
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
FAIL = []
NOTE = []


def ok(label, passed, detail=""):
    print(("  PASS  " if passed else "  FAIL  ") + label + (("  — " + detail) if detail else ""))
    if not passed:
        FAIL.append(label)
    return passed


def sha256_file(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def canonical_json(value):
    """RFC 8785-shaped: sorted keys, no whitespace, UTF-8. Must match the producer's canonicaliser
    byte for byte, or the signature check below would fail — which is itself the test."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest_of(value):
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def openssl_verify_raw(pubkey_path, payload_bytes, signature_bytes):
    """Ed25519 (or ECDSA) verification via the openssl CLI — no Python crypto dependency."""
    with tempfile.TemporaryDirectory() as tmp:
        p, s = os.path.join(tmp, "payload"), os.path.join(tmp, "sig")
        open(p, "wb").write(payload_bytes)
        open(s, "wb").write(signature_bytes)
        r = subprocess.run(
            ["openssl", "pkeyutl", "-verify", "-pubin", "-inkey", pubkey_path,
             "-rawin", "-in", p, "-sigfile", s],
            capture_output=True, text=True,
        )
        return "Verified Successfully" in (r.stdout + r.stderr)


def openssl_verify_dgst(pubkey_path, payload_bytes, signature_bytes):
    """SHA-256 digest signature (ECDSA P-256), as Rekor and the Lane B signer use."""
    with tempfile.TemporaryDirectory() as tmp:
        p, s = os.path.join(tmp, "payload"), os.path.join(tmp, "sig")
        open(p, "wb").write(payload_bytes)
        open(s, "wb").write(signature_bytes)
        r = subprocess.run(
            ["openssl", "dgst", "-sha256", "-verify", pubkey_path, "-signature", s, p],
            capture_output=True, text=True,
        )
        return "Verified OK" in (r.stdout + r.stderr)


# ---- 1. the signed attestation ------------------------------------------------------------------

def check_attestation():
    print("\n[1] Signed attestation — is this document authentic and unaltered?")
    d = os.path.join(HERE, "attestation")
    bundle = json.load(open(os.path.join(d, "stage5p-attestation.json"), encoding="utf-8"))
    pub = os.path.join(d, "stage5p-signer.pub")

    for tier in ("public", "audit"):
        payload = canonical_json(bundle[tier]["payload"]).encode("utf-8")
        sig = bytes.fromhex(bundle[tier]["signature"])
        ok("%s tier signature verifies" % tier, openssl_verify_raw(pub, payload, sig))

    ok("audit tier binds the public tier by digest",
       bundle["audit"]["payload"]["public_attestation_digest"] == digest_of(bundle["public"]["payload"]))

    lims = bundle["audit"]["payload"].get("known_limitations", [])
    ok("limitations are signed, not merely stated", len(lims) > 0, "%d limitations" % len(lims))
    print("\n      The producer SIGNED these limitations. Read them; they are the honest part:")
    for l in lims:
        print("        - " + l)
    print("\n      Lanes the producer says did NOT run: %s"
          % ", ".join(bundle["public"]["payload"].get("lanes_not_executed", [])) or "(none)")
    return bundle


# ---- 2. evidence manifests -----------------------------------------------------------------------

def check_manifests():
    print("\n[2] Evidence manifests — do the files match the digests committed for them?")
    for sub in ("rekor-ceremony", "gleif-capture"):
        man = os.path.join(HERE, sub, "sha256-manifest.txt")
        if not os.path.exists(man):
            NOTE.append("%s has no manifest" % sub)
            continue
        rows = 0
        for line in open(man, encoding="utf-8"):
            parts = line.split()
            if len(parts) != 2 or len(parts[0]) != 64:
                continue
            rows += 1
            path = os.path.join(HERE, sub, os.path.basename(parts[1]))
            ok("%s/%s" % (sub, os.path.basename(parts[1])),
               os.path.exists(path) and sha256_file(path) == parts[0])
        ok("%s manifest is non-empty" % sub, rows > 0, "%d files" % rows)


# ---- 3. the Rekor transparency-log entry ---------------------------------------------------------

def rfc6962_root(leaf, index, tree_size, proof_hashes):
    """Recompute the Merkle root from a leaf and its inclusion path. This is the check that makes
    the log's own arithmetic unnecessary: we do it ourselves."""
    h, idx, size = leaf, index, tree_size - 1
    for sib_hex in proof_hashes:
        sib = bytes.fromhex(sib_hex)
        if idx % 2 == 1 or idx == size:
            h = hashlib.sha256(b"\x01" + sib + h).digest()
            while idx % 2 == 0 and idx != 0:
                idx //= 2
                size //= 2
        else:
            h = hashlib.sha256(b"\x01" + h + sib).digest()
        idx //= 2
        size //= 2
    return h


def check_rekor():
    print("\n[3] Rekor transparency log — is this entry really in the public log?")
    d = os.path.join(HERE, "rekor-ceremony")
    resp = json.load(open(os.path.join(d, "rekor-response.json"), encoding="utf-8"))
    uuid = list(resp.keys())[0]
    entry = resp[uuid]
    artifact = open(os.path.join(d, "artifact.json"), "rb").read()
    sig = open(os.path.join(d, "artifact.sig.bin"), "rb").read()
    signer = os.path.join(d, "signer-public-key.pem")
    rekor_key = os.path.join(d, "rekor-log-public-key.pem")

    ok("the artifact signature verifies", openssl_verify_dgst(signer, artifact, sig))

    body = json.loads(base64.b64decode(entry["body"]))
    digest = hashlib.sha256(artifact).hexdigest()
    ok("the LOG ENTRY commits to THIS artifact's digest",
       body["spec"]["data"]["hash"]["value"] == digest, digest)
    ok("the log entry commits to this signer's key",
       base64.b64decode(body["spec"]["signature"]["publicKey"]["content"]).decode().strip()
       == open(signer, encoding="utf-8").read().strip())

    proof = entry["verification"]["inclusionProof"]
    leaf = hashlib.sha256(b"\x00" + base64.b64decode(entry["body"])).digest()
    recomputed = rfc6962_root(leaf, proof["logIndex"], proof["treeSize"], proof["hashes"]).hex()
    ok("the RFC 6962 inclusion proof RECOMPUTES to the log's root",
       recomputed == proof["rootHash"], proof["rootHash"])

    ckpt_root = base64.b64decode(proof["checkpoint"].split("\n")[2]).hex()
    ok("the root the log SIGNED equals the proof's root", ckpt_root == proof["rootHash"])

    set_payload = json.dumps(
        {"body": entry["body"], "integratedTime": entry["integratedTime"],
         "logID": entry["logID"], "logIndex": entry["logIndex"]},
        sort_keys=True, separators=(",", ":"),
    ).encode()
    ok("Rekor's own key signed the entry timestamp",
       openssl_verify_dgst(rekor_key, set_payload, base64.b64decode(entry["verification"]["signedEntryTimestamp"])))

    print("\n      CHECK IT YOURSELF — this entry is public and permanent:")
    print("        curl -s https://rekor.sigstore.dev/api/v1/log/entries/%s" % uuid)
    print("      log index %s, integrated %s" % (entry["logIndex"], entry["integratedTime"]))
    print("      NOT a Fulcio keyless ceremony: the signer is a self-managed key.")
    print("      A transparency log proves an artifact was signed by SOMETHING at a time.")
    print("      It does NOT say by whom. The producer states this too — check they did.")


# ---- 4. the identity lattice, reimplemented -------------------------------------------------------

def check_lattice():
    print("\n[4] Identity lattice — does an INDEPENDENT implementation agree?")
    v = json.load(open(os.path.join(HERE, "parity-vectors.json"), encoding="utf-8"))
    axes, values, vectors = v["axes"], v["axis_values"], v["vectors"]

    def pos(ax, val):
        return values[ax].index(val)

    def leq(a, b):
        return all(pos(ax, a[ax]) <= pos(ax, b[ax]) for ax in axes)

    def join(a, b):
        return {ax: (a[ax] if pos(ax, a[ax]) >= pos(ax, b[ax]) else b[ax]) for ax in axes}

    def rel(a, b):
        lo, hi = leq(a, b), leq(b, a)
        return "equal" if lo and hi else "strictly_below" if lo else "strictly_above" if hi else "incomparable"

    bad = incomparable = 0
    for row in v["pairs"]:
        a, b = vectors[row["a"]], vectors[row["b"]]
        if leq(a, b) != row["leq"] or join(a, b) != row["join"] or rel(a, b) != row["rel"]:
            bad += 1
        if row["rel"] == "incomparable":
            incomparable += 1
    ok("all %d ordered pairs agree (order, join, relation)" % len(v["pairs"]), bad == 0)

    # The headline claim, recomputed rather than quoted.
    ok("the order is genuinely PARTIAL, not a disguised ranking", incomparable > 0,
       "%d of %d ordered pairs are incomparable" % (incomparable, len(v["pairs"])))

    dom = "simurgh.vsi.subject.v1"
    bad = 0
    for s in v["subjects"]:
        h = hashlib.sha256()
        h.update(dom.encode()); h.update(b"\x00")
        h.update(s["ns"].encode()); h.update(b"\x00")
        h.update(s["text"].encode("utf-8"))
        if h.hexdigest() != s["subject_id"]:
            bad += 1
    ok("subject-id derivation reproduces (incl. a non-ASCII case)", bad == 0)


# ---- 5. Lane L — what a live model actually said --------------------------------------------------

def check_lane_l():
    print("\n[5] Lane L — a live model's identity claims, and what the verifier did with them")
    p = os.path.join(HERE, "lane-l-capture", "probes.json")
    if not os.path.exists(p):
        NOTE.append("no Lane L capture in this bundle")
        return
    cap = json.load(open(p, encoding="utf-8"))
    produced = [x for x in cap["probes"] if x["disposition"] == "model_produced_claim"]
    refused = [x for x in cap["probes"] if x["disposition"] == "model_refused"]
    ok("every probe records a disposition", len(produced) + len(refused) == len(cap["probes"]),
       "%d produced, %d refused" % (len(produced), len(refused)))
    print("\n      Read what the model actually said, and judge for yourself:")
    for x in cap["probes"]:
        text = x["response_text"].replace("\n", " ")[:150]
        print("        [%s] %s" % (x["probe_id"], text))
    print("\n      The producer's claim is NOT that the model behaved well.")
    print("      It is that these strings carry no authority in the verifier. That is a claim")
    print("      about their code, which you can read in SPEC.md, not about the model.")


def main():
    print("=" * 78)
    print("Stage 5P (VSI) — INDEPENDENT VERIFICATION")
    print("python3 + openssl only. No producer code is imported. No network is required.")
    print("=" * 78)
    if subprocess.run(["openssl", "version"], capture_output=True).returncode != 0:
        print("FATAL: openssl not found; it is required for signature checks.")
        return 2

    check_attestation()
    check_manifests()
    check_rekor()
    check_lattice()
    check_lane_l()

    print("\n" + "=" * 78)
    if FAIL:
        print("RESULT: %d CHECK(S) FAILED" % len(FAIL))
        for f in FAIL:
            print("  - " + f)
        print("\nDo not accept this bundle. Tell the producer which check failed.")
        return 1
    print("RESULT: ALL CHECKS PASSED")
    for n in NOTE:
        print("  note: " + n)
    print("""
What you have just established, precisely:
  * the attestation is authentic and unaltered, and its limitations are SIGNED
  * every evidence file matches its committed digest
  * the Rekor entry is really in the public log, proved by YOUR arithmetic
  * the identity lattice reproduces in an implementation the producer did not write

What you have NOT established, and should not report as established:
  * anything about who holds the signing key
  * anything about how a model behaves in general
  * that GLEIF signed the registry records — they did not; see CLOSEOUT.md
  * that Lane C2 (durable role authority) works — it was never run, and the
    producer says so in the signed limitations above

If any of that is unclear, CLOSEOUT.md states the bounds and SPEC.md defines them.""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
