# SPDX-License-Identifier: AGPL-3.0-or-later
# Shared canonical JSON + digest + SPKI-DER fingerprint for the VFC foreign-capture pack. Byte-matches the
# Node verifier (tools/simurgh-attestation/canonicalise.mjs + stage5g/core).
import hashlib, json
from cryptography.hazmat.primitives import serialization

DOMAIN = {
    "challenge_receipt": "simurgh.vfc.challenge_receipt.v1\n",
    "producer_transcript": "simurgh.vfc.producer_transcript.v1\n",
    "capture": "simurgh.vfc.capture.v1\n",
    "producer_identity": "simurgh.vfc.producer_identity.v1\n",
    "verifier_identity": "simurgh.vfc.verifier_identity.v1\n",
}

def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def sha256_hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()

def domain_digest(dom, obj):
    return sha256_hex(dom + canonical(obj))

def artifact_digest(obj):
    return sha256_hex(canonical(obj))

def identity_digest(identity, role):
    return domain_digest(DOMAIN[role + "_identity"], identity)

def fingerprint(pub_pem):
    key = serialization.load_pem_public_key(pub_pem.encode("utf-8"))
    der = key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return "sha256:" + hashlib.sha256(der).hexdigest()
