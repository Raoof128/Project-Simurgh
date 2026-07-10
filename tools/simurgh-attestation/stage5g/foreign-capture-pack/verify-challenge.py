#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# VFC foreign producer — verify the Simurgh challenge receipt under the EXTERNAL verifier pin BEFORE
# running the detector. Exit 0 iff the receipt is genuine. Usage: verify-challenge.py <receipt.json>
#   <verifier-identity.json> <verifier-pin.json>
import json, sys
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives import serialization
from _vfc_common import DOMAIN, canonical, domain_digest, identity_digest, fingerprint

def main(receipt_p, vid_p, pin_p):
    receipt = json.load(open(receipt_p)); vid = json.load(open(vid_p)); pin = json.load(open(pin_p))
    if fingerprint(vid["public_key_pem"]) != pin["verifier_key_fingerprint"]: return 1
    if vid["identity_subject"] != pin["verifier_identity_subject"]: return 1
    if identity_digest(vid, "verifier") != pin["verifier_identity_digest"]: return 1
    if receipt["content"]["verifier_identity_digest"] != identity_digest(vid, "verifier"): return 1
    if domain_digest(DOMAIN["challenge_receipt"], receipt["content"]) != receipt["challenge_record_digest"]: return 1
    pub = serialization.load_pem_public_key(vid["public_key_pem"].encode())
    try:
        pub.verify(bytes.fromhex(""), b"") if False else pub.verify(
            __import__("base64").b64decode(receipt["verifier_signature"]),
            (DOMAIN["challenge_receipt"] + canonical(receipt["content"])).encode())
    except Exception:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
