#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# VFC foreign producer — assemble the capture object + producer transcript and sign BOTH with the
# ACTOR-controlled Ed25519 key. Returns ONLY the capture package (no Simurgh private material touched).
# Usage: sign-transcript.py <capture-cells.json> <challenge-receipt.json> <actor-key.pem> <snapshot-digest> <corpus-digest> <out.json>
import base64, json, sys
from cryptography.hazmat.primitives import serialization
from _vfc_common import DOMAIN, canonical, domain_digest, identity_digest, fingerprint

def main(cells_p, receipt_p, key_p, snap_digest, corpus_digest, out_p):
    cells = json.load(open(cells_p))["cells"]; receipt = json.load(open(receipt_p))
    priv = serialization.load_pem_private_key(open(key_p, "rb").read(), password=None)
    pub_pem = priv.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    producer = {"identity_subject": "external-actor", "public_key_pem": pub_pem,
                "key_fingerprint": fingerprint(pub_pem), "anchor_type": "none", "anchor_subject": ""}
    capture = {"schema": "simurgh.vfc.capture.v1", "producer_identity_ref": identity_digest(producer, "producer"),
               "detector_snapshot_digest": snap_digest, "corpus_digest": corpus_digest, "cells": cells}
    tc = {"capture_digest": domain_digest(DOMAIN["capture"], capture),
          "producer_identity_digest": identity_digest(producer, "producer"),
          "producer_key_fingerprint": producer["key_fingerprint"],
          "challenge_record_digest": receipt["challenge_record_digest"]}
    sig = priv.sign((DOMAIN["producer_transcript"] + canonical(tc)).encode())
    package = {"producer_identity": producer, "capture": capture,
               "producer_transcript": {"schema": "simurgh.vfc.producer_transcript.v1", "content": tc,
                                       "producer_signature": base64.b64encode(sig).decode()}}
    json.dump(package, open(out_p, "w"), indent=2)
    print(f"[foreign-pack/sign] wrote capture package to {out_p} (rung-1 challenge_bound)")

if __name__ == "__main__":
    main(*sys.argv[1:7])
