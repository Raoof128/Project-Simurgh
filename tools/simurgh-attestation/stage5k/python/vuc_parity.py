#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5K VUC — Python parity verifier. INDEPENDENT (stdlib-only) reimplementation of the deterministic
# decision surface: canonicalJson byte-equality, domain-separated digests, the frozen Merkle-set
# (raw-byte node hashing, odd-node promoted), the cross-stage projection, and the U_commit/U_vpc/U_vrc set
# digests. Must byte-agree with the Node verifier. Ed25519 signatures are the JS adapter's job.
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5k"

LEAF_DOM = "simurgh.vuc.leaf.v1"
NODE_DOM = "simurgh.vuc.node.v1"
SUBJECT_DOM = "simurgh.vuc.section_subject.v1"
COMMIT_DOM = "simurgh.vuc.commitment.v1"


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def artifact_digest(obj):
    return sha256hex(canonical(obj))


def domain_digest(dom, obj):
    return sha256hex(dom + canonical(obj))


def leaf_hash(leaf):
    payload = canonical(
        {
            "leaf_id": leaf["leaf_id"],
            "leaf_type": leaf["leaf_type"],
            "subject_digest": leaf["subject_digest"],
        }
    )
    return hashlib.sha256(
        LEAF_DOM.encode("utf-8") + b"\x00" + payload.encode("utf-8")
    ).digest()


def node_hash(left, right):
    return hashlib.sha256(NODE_DOM.encode("utf-8") + b"\x00" + left + right).digest()


def merkle_root(hashes):
    level = hashes
    while len(level) > 1:
        nxt = []
        for i in range(0, len(level), 2):
            nxt.append(node_hash(level[i], level[i + 1]) if i + 1 < len(level) else level[i])
        level = nxt
    return level[0]


def subject_digest(partition_digest, s):
    return domain_digest(
        SUBJECT_DOM,
        {
            "partition_digest": partition_digest,
            "section_id": s["section_id"],
            "canonical_path": s["canonical_path"],
            "redaction_types": s.get("redaction_types", []),
        },
    )


def project(sections_by_id, ids, partition_digest):
    out = []
    for i in ids:
        s = sections_by_id.get(i)
        if s is None:
            continue
        out.append(
            {
                "leaf_id": s["section_id"],
                "leaf_type": "vpc_section",
                "subject_digest": subject_digest(partition_digest, s),
            }
        )
    return out


def universe_set_digest(leaves):
    triples = sorted(
        (
            {"leaf_id": l["leaf_id"], "leaf_type": l["leaf_type"], "subject_digest": l["subject_digest"]}
            for l in leaves
        ),
        key=lambda t: t["leaf_id"],
    )
    return artifact_digest({"universe_triples": triples})


def verify(evid=EVID):
    bundle = json.loads((evid / "bundle.json").read_text())
    cfg = json.loads((evid / "external-config.json").read_text())
    vpc = cfg["vpc_bundle"]
    vrc = cfg["vrc_bundle"]
    uc = bundle["universe_commitment"]

    leaves = uc["leaves"]
    # 1. leaf_digest recompute
    for l in leaves:
        if "sha256:" + leaf_hash(l).hex() != l["leaf_digest"]:
            return 349, {"where": "leaf_digest", "leaf_id": l["leaf_id"]}
    # 2. universe_root recompute
    root = "sha256:" + merkle_root([leaf_hash(l) for l in leaves]).hex()
    if root != uc["universe_root"]:
        return 349, {"where": "universe_root"}
    # 3. commitment digest recompute
    pcs = bundle["producer_commitment_statement"]
    commit = domain_digest(
        COMMIT_DOM,
        {
            "schema_version": bundle["schema_version"],
            "composition_profile": bundle["composition_profile"],
            "producer_identity_digest": pcs["producer_identity_digest"],
            "canonicalization_profile": uc["canonicalization_profile"],
            "tree_profile": uc["tree_profile"],
            "hash_algorithm": uc["hash_algorithm"],
            "leaf_count": uc["leaf_count"],
            "universe_root": uc["universe_root"],
        },
    )
    if commit != uc["universe_commitment_digest"]:
        return 349, {"where": "commitment_digest"}

    # 4. U_commit / U_vpc / U_vrc set digests
    partition_digest = vpc["attestation"]["content"]["partition_digest"]
    sections_by_id = {s["section_id"]: s for s in vpc["partition"]["content"]["sections"]}
    covered = sorted({sec for c in vpc["coverage_receipts"] for sec in c["content"]["evaluated_sections"]})
    rated = sorted({p["content"]["section_id"] for p in vrc["producer_ratings"]})
    u_commit = [
        {"leaf_id": l["leaf_id"], "leaf_type": l["leaf_type"], "subject_digest": l["subject_digest"]}
        for l in leaves
    ]
    u_vpc = project(sections_by_id, covered, partition_digest)
    u_vrc = project(sections_by_id, rated, partition_digest)
    d_commit = universe_set_digest(u_commit)
    d_vpc = universe_set_digest(u_vpc)
    d_vrc = universe_set_digest(u_vrc)
    if not (d_commit == d_vpc == d_vrc):
        return 357, {"commit": d_commit, "vpc": d_vpc, "vrc": d_vrc}

    # cross-check against the stored bijection census
    bij = bundle["projections"]["bijection_census"]
    if not (bij["commit"] == d_commit and bij["vpc"] == d_vpc and bij["vrc"] == d_vrc and bij["equal"]):
        return 361, {"where": "bijection_census"}

    return 0, {
        "universe_root": root,
        "universe_commitment_digest": commit,
        "u_commit": d_commit,
        "u_vpc": d_vpc,
        "u_vrc": d_vrc,
    }


if __name__ == "__main__":
    raw, info = verify()
    print(json.dumps({"raw": raw, **info}))
    sys.exit(0 if raw == 0 else 1)
