#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5L VTC-Q — Node <-> Python parity over the deterministic surface. Stdlib only. Recomputes the
# frozen H_DS construction (UTF8(tag) || 0x00 || UTF8(canonicalJson(payload))) and the capability
# derivations, and asserts byte-identical results against the committed Lane-A bundle.
import hashlib
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
CASE = os.path.join(ROOT, "docs/research/llm-shield/evidence/stage-5l/lane-a/quorum-confirmed-stub")

DOM = {
    "commitment_session": "simurgh.vtcq.commitment_session.v1",
    "verified_anchor_set": "simurgh.vtcq.verified_anchor_set.v1",
    "start_capability_root": "simurgh.vtcq.start_capability_root.v1",
    "release_capability": "simurgh.vtcq.release_capability.v1",
}


def canonical_json(value):
    # mirror JS canonicalise: recursively sort object keys, compact separators.
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def h_ds_bytes(tag, payload):
    return hashlib.sha256(tag.encode("utf-8") + b"\x00" + canonical_json(payload).encode("utf-8")).digest()


def h_ds(tag, payload):
    return "sha256:" + h_ds_bytes(tag, payload).hex()


def anchor_record(a):
    if a["anchor_type"] == "rfc3161_tsa":
        return {"anchor_type": "rfc3161_tsa", "trust_domain": a["trust_domain"], "tsa_token_digest": a["tsa_token_digest"]}
    if a["anchor_type"] == "bitcoin_ots":
        return {"anchor_type": "bitcoin_ots", "trust_domain": a["trust_domain"], "ots_proof_digest": a["ots_proof_digest"]}
    return {"anchor_type": a["anchor_type"], "trust_domain": a["trust_domain"]}


def verified_anchor_set_digest(anchors):
    records = sorted((json.dumps(anchor_record(a), sort_keys=True, separators=(",", ":")) for a in anchors))
    return h_ds(DOM["verified_anchor_set"], [json.loads(r) for r in records])


def main():
    with open(os.path.join(CASE, "bundle.json"), encoding="utf-8") as f:
        b = json.load(f)
    cc = b["ceremony_contract"]
    commitment_payload = dict(cc)
    commitment_payload.update(
        schema_version=b["schema_version"], campaign_id=b["campaign_id"], vuc_root=b["vuc"]["universe_commitment_digest"]
    )
    commitment_session_id = h_ds(DOM["commitment_session"], commitment_payload)
    vasd = verified_anchor_set_digest(b["anchors"])
    r = b["review_access_authorisation_receipt"]
    scr = h_ds(
        DOM["start_capability_root"],
        {
            "commitment_session_id": commitment_session_id,
            "verified_anchor_set_digest": vasd,
            "gate_public_key_fingerprint": r["gate_public_key_fingerprint"],
            "issuance_nonce": r["issuance_nonce"],
        },
    )
    ok = (
        commitment_session_id == b["commitment_session_id"]
        and scr == r["start_capability_root_digest"]
    )
    print(json.dumps({
        "raw": 0 if ok else 1,
        "commitment_session_id": commitment_session_id,
        "verified_anchor_set_digest": vasd,
        "start_capability_root_digest": scr,
    }))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
