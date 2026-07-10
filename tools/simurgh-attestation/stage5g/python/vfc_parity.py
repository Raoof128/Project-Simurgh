#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5G VFC — Python parity verifier. INDEPENDENT (stdlib-only) reimplementation of canonicalJson
# byte-equality, the domain-separated digest surface, and the rung-predicate lattice. These must
# byte-agree with the Node verifier. Ed25519 signature verification and the Sigstore kernel are the JS
# side's job (a vendored/native kernel), out of scope for this pure-arithmetic parity check.
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5g"

DOMAIN = {
    "challenge_receipt": "simurgh.vfc.challenge_receipt.v1\n",
    "producer_transcript": "simurgh.vfc.producer_transcript.v1\n",
    "foreign_capture": "simurgh.vfc.foreign_capture.v1\n",
    "capture": "simurgh.vfc.capture.v1\n",
    "anchor_evidence": "simurgh.vfc.anchor_evidence.v1\n",
    "verifier_identity": "simurgh.vfc.verifier_identity.v1\n",
    "producer_identity": "simurgh.vfc.producer_identity.v1\n",
    "capture_census": "simurgh.vfc.capture_census.v1\n",
}


def canonical(value):
    # Matches the JS canonicalJson: recursively sort object keys, compact separators.
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def domain_digest(dom, obj):
    return sha256_hex(dom + canonical(obj))


def artifact_digest(obj):
    return sha256_hex(canonical(obj))


def identity_digest(identity, role):
    return domain_digest(DOMAIN[role + "_identity"], identity)


def main():
    b = json.loads((EVID / "vfc-attestation.json").read_text())
    census = json.loads((EVID / "capture-census.json").read_text())
    panel = json.loads((EVID / "panel-plan.json").read_text())
    corpus = json.loads((EVID / "shared-corpus.json").read_text())
    snap = json.loads((EVID / "detector-snapshot-manifest.json").read_text())
    fail = []

    tc = b["producer_transcript"]["content"]

    if domain_digest(DOMAIN["capture"], b["capture"]) != tc["capture_digest"]:
        fail.append("capture_digest")
    if identity_digest(b["producer_identity"], "producer") != tc["producer_identity_digest"]:
        fail.append("producer_identity_digest")
    if b["capture"]["producer_identity_ref"] != identity_digest(b["producer_identity"], "producer"):
        fail.append("producer_identity_ref")
    if domain_digest(DOMAIN["capture_census"], census) != b["capture_census_digest"]:
        fail.append("capture_census_digest")

    if artifact_digest(panel) != b["panel_plan_ref"]["digest"]:
        fail.append("panel_plan_digest")
    if artifact_digest(corpus) != b["corpus_ref"]["digest"]:
        fail.append("corpus_digest")
    if artifact_digest(snap) != b["detector_snapshot_ref"]["digest"]:
        fail.append("detector_snapshot_digest")

    receipt = b.get("challenge_receipt")
    if receipt is not None:
        rc = receipt["content"]
        if domain_digest(DOMAIN["challenge_receipt"], rc) != receipt["challenge_record_digest"]:
            fail.append("challenge_record_digest")
        if tc.get("challenge_record_digest") != receipt["challenge_record_digest"]:
            fail.append("transcript_challenge_binding")
        if rc["verifier_identity_digest"] != identity_digest(b["verifier_identity"], "verifier"):
            fail.append("verifier_identity_digest")
        if artifact_digest(panel) != rc["panel_plan_digest"]:
            fail.append("receipt_panel_plan_digest")

    # Rung lattice (predicate view): challenge binding present => challenge_bound; anchor => anchored.
    challenge_bound = receipt is not None and tc.get("challenge_record_digest") is not None
    anchor = b.get("anchor_evidence") is not None
    proven = "distinct_key_only"
    if challenge_bound:
        proven = "externally_anchored" if anchor else "challenge_bound"
    claimed = b["separation_claim"]["claimed_rung"]
    order = ["distinct_key_only", "challenge_bound", "externally_anchored"]
    if order.index(claimed) > order.index(proven):
        fail.append("separation_overclaim")

    print(json.dumps({"vfc_parity": "corroborated" if not fail else "FAILED", "mismatches": fail}))
    return 0 if not fail else 1


if __name__ == "__main__":
    sys.exit(main())
