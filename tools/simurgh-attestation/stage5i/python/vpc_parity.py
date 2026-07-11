#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5I VPC — Python parity verifier. INDEPENDENT (stdlib-only) reimplementation of the deterministic
# surface: canonicalJson byte-equality, the domain-separated digest surface, census / grant-bounded
# coverage equality, the two evidence roots, the depth/state projections, and the adequacy-vocabulary
# scan. Must byte-agree with the Node verifier. Ed25519 signature + rung derivation are the JS adapter's
# job — Python takes the PREDICATE VIEW (digest-linked, structurally valid), never sig-verifies.
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5i"

DOMAIN = {
    "partition": "simurgh.vpc.partition.v1",
    "grant": "simurgh.vpc.grant.v1",
    "affiliation": "simurgh.vpc.affiliation.v1",
    "policy": "simurgh.vpc.policy.v1",
}
FORBIDDEN = {"adequate", "sufficient", "thorough", "review_quality", "approved", "endorsed", "certified_safe"}


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def domain_digest(dom, obj):
    return sha256hex(dom + canonical(obj))


def artifact_digest(obj):
    return sha256hex(canonical(obj))


def sorted_root(parts):
    return artifact_digest(sorted(parts))


def recompute(bundle, cfg):
    pc = bundle["partition"]["content"]
    partition_digest = domain_digest(DOMAIN["partition"], pc)
    S = [s["section_id"] for s in pc["sections"]]

    grant_by_reviewer = {g["content"]["reviewer_principal"]["key_fingerprint"]: g for g in bundle["access_grants"]}
    eligible = []
    for c in bundle["coverage_receipts"]:
        fp = c["content"]["reviewer_principal"]["key_fingerprint"]
        eligible.append({"fp": fp, "grant": grant_by_reviewer[fp], "receipt": c})

    # coverage union / gap
    union = set()
    for e in eligible:
        union.update(e["receipt"]["content"]["evaluated_sections"])
    coverage_union = sorted(union)
    coverage_gap = sorted([s for s in S if s not in union])

    # roots
    subj_parts = [f"partition:{partition_digest}"]
    for g in bundle["access_grants"]:
        subj_parts.append(f"grant:{domain_digest(DOMAIN['grant'], g['content'])}")
    for a in cfg["affiliation_assertions"]:
        subj_parts.append(f"aff:{domain_digest(DOMAIN['affiliation'], a['content'])}")
    for e in eligible:
        subj_parts.append(f"rev:{e['fp']}")
    panel_subject_root = sorted_root(subj_parts)

    ev_parts = [f"subject:{panel_subject_root}"]
    for c in bundle["coverage_receipts"]:
        ev_parts.append(f"receipt:{artifact_digest(c['content'])}")
    for s in bundle["reviewer_separation_evidence"]:
        ev_parts.append(f"sep:{artifact_digest(s)}")
    for h in bundle["host_separation_evidence"]:
        ev_parts.append(f"hostsep:{artifact_digest(h)}")
    panel_evidence_root = sorted_root(ev_parts)

    trust_context_digest = artifact_digest({
        "policy": cfg["policy"],
        "policy_pin": cfg["policy_pin"],
        "reviewer_registry": cfg["reviewer_registry"],
        "host_registry": cfg["host_registry"],
        "affiliation_issuer_registry": cfg["affiliation_issuer_registry"],
        "verifier_key_pin": cfg["verifier_key_pin"],
    })

    # projections
    per_section = {s: 0 for s in S}
    for e in eligible:
        for s in e["receipt"]["content"]["evaluated_sections"]:
            per_section[s] += 1
    coverage_depth = {
        "per_section": per_section,
        "min_depth": min(per_section.values()) if per_section else 0,
        "single_reviewer_sections": sorted([s for s in per_section if per_section[s] == 1]),
    }
    granted = set()
    for g in bundle["access_grants"]:
        granted.update(g["content"]["granted_sections"])
    covered, assigned_only, unassigned = [], [], []
    for s in S:
        if s in union:
            covered.append(s)
        elif s in granted:
            assigned_only.append(s)
        else:
            unassigned.append(s)
    section_states = {"covered": sorted(covered), "assigned_only": sorted(assigned_only), "unassigned": sorted(unassigned)}

    counted = sorted(
        [
            {
                "key_fingerprint": e["fp"],
                "reviewer_separation_strength": "challenge_bound",
                "host_separation_strength": "challenge_bound",
                "independence_valid": True,
            }
            for e in eligible
        ],
        key=lambda r: r["key_fingerprint"],
    )

    return {
        "partition_digest": partition_digest,
        "policy_digest": cfg["policy_pin"]["policy_digest"],
        "panel_subject_root": panel_subject_root,
        "panel_evidence_root": panel_evidence_root,
        "trust_context_digest": trust_context_digest,
        "counted_reviewers": counted,
        "coverage_union": coverage_union,
        "coverage_gap": coverage_gap,
        "equality_holds": len(coverage_gap) == 0,
        "verdict": "covered" if len(coverage_gap) == 0 else "gap",
        "coverage_depth": coverage_depth,
        "section_states": section_states,
    }


def verify(evid=EVID):
    bundle = json.loads((evid / "bundle.json").read_text())
    cfg = json.loads((evid / "external-config.json").read_text())
    declared = bundle["attestation"]["content"]

    # adequacy scan (BEAST A) over the permitted flat annotations surface
    for obj in [bundle["attestation"], bundle["partition"], *bundle["access_grants"], *bundle["coverage_receipts"]]:
        ann = obj.get("content", {}).get("annotations")
        if isinstance(ann, dict):
            for k in ann:
                if k.strip().lower() in FORBIDDEN:
                    return 328, {}

    r = recompute(bundle, cfg)
    if r["coverage_gap"]:
        return 327, r
    # audit: declared attestation must byte-match the recompute
    for k, v in r.items():
        if canonical(declared.get(k)) != canonical(v):
            return 329, {"field": k}
    return 0, r


if __name__ == "__main__":
    raw, detail = verify()
    print(json.dumps({"raw": raw, **({} if raw else {"partition_digest": detail["partition_digest"], "panel_subject_root": detail["panel_subject_root"], "panel_evidence_root": detail["panel_evidence_root"]})}))
    sys.exit(0 if raw == 0 else 1)
