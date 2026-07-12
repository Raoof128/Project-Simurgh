#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5J VRC — Python parity verifier. INDEPENDENT (stdlib-only) reimplementation of the deterministic
# decision surface: canonicalJson byte-equality, the domain-separated digests, the DERIVED obligation /
# ledger / contest-layer / projection roots, the historical contest-event census, and the derived-state
# census. Must byte-agree with the Node verifier. Ed25519 signatures are the JS adapter's job — Python
# takes the PREDICATE VIEW (digest-linked, structurally valid), never sig-verifies.
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5j"

DOM = {
    "scale": "simurgh.vrc.scale.v1",
    "contest_event": "simurgh.vrc.contest_event.v1",
}


def canonical(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def artifact_digest(obj):
    return sha256hex(canonical(obj))


def coverage(vpc_bundle):
    S = [
        s if isinstance(s, str) else s["section_id"]
        for s in vpc_bundle["partition"]["content"]["sections"]
    ]
    cov = {}
    for c in vpc_bundle["coverage_receipts"]:
        rid = c["content"]["reviewer_principal"]["key_fingerprint"]
        cov[rid] = list(c["content"]["evaluated_sections"])
    return S, cov


def obligation_root(vpc_bundle):
    S, cov = coverage(vpc_bundle)
    pairs = sorted(f"{s}:{rid}" for rid, secs in cov.items() for s in secs)
    return artifact_digest({"required_reviewer_pairs": pairs, "required_producer_sections": sorted(S)})


def ledger_root(bundle):
    return artifact_digest(
        {
            "reviewer": sorted(e["entry_digest"] for e in bundle["reviewer_ratings"]),
            "producer": sorted(e["entry_digest"] for e in bundle["producer_ratings"]),
        }
    )


def contest_layer_root(bundle):
    return artifact_digest(
        {
            "epoch_tickets": [t["epoch_ticket_digest"] for t in bundle["epoch_tickets"]],
            "contest_history": sorted(c["contest_event_digest"] for c in bundle["contest_history"]),
            "producer_responses": sorted(r["response_digest"] for r in bundle["producer_responses"]),
            "concurrences": sorted(c["concurrence_digest"] for c in bundle["concurrences"]),
            "reviewer_rebuttals": sorted(r["rebuttal_digest"] for r in bundle["reviewer_rebuttals"]),
        }
    )


def comparable(entry, dims):
    return entry["content"]["value_kind"] == "ordinal" and entry["content"]["dimension_id"] in dims


def recompute_events(bundle):
    ranks = bundle["rating_scale"]["content"]["ordinal_ranks"]
    dims = set(bundle["rating_scale"]["content"]["comparable_dimensions"])
    by_section = {}
    for p in bundle["producer_ratings"]:
        by_section.setdefault(p["content"]["section_id"], {"prod": [], "rev": []})["prod"].append(p)
    for r in bundle["reviewer_ratings"]:
        by_section.setdefault(r["content"]["section_id"], {"prod": [], "rev": []})["rev"].append(r)
    events = set()
    for s, group in by_section.items():
        for p in group["prod"]:
            for r in group["rev"]:
                if not comparable(p, dims) or not comparable(r, dims):
                    continue
                if ranks[p["content"]["value"]] < ranks[r["content"]["value"]]:
                    events.add((s, r["content"]["reviewer_id"], p["entry_digest"], r["entry_digest"]))
    return events


def projections(bundle):
    ranks = bundle["rating_scale"]["content"]["ordinal_ranks"]
    dims = set(bundle["rating_scale"]["content"]["comparable_dimensions"])
    prod_by = {p["content"]["section_id"]: p for p in bundle["producer_ratings"]}

    def rev_by(s, r):
        return next(
            e
            for e in bundle["reviewer_ratings"]
            if e["content"]["section_id"] == s and e["content"]["reviewer_id"] == r
        )

    census = [
        {
            "section_id": ce["content"]["section_id"],
            "reviewer_id": ce["content"]["reviewer_id"],
            "producer_rating": prod_by[ce["content"]["section_id"]]["content"]["value"],
            "reviewer_ratings": [rev_by(ce["content"]["section_id"], ce["content"]["reviewer_id"])["content"]["value"]],
        }
        for ce in bundle["contest_history"]
    ]
    comparable_pairs = 0
    for rev in bundle["reviewer_ratings"]:
        prod = prod_by[rev["content"]["section_id"]]
        if comparable(rev, dims) and comparable(prod, dims):
            comparable_pairs += 1
    total_delta = 0
    for ce in bundle["contest_history"]:
        prod = prod_by[ce["content"]["section_id"]]
        rev = rev_by(ce["content"]["section_id"], ce["content"]["reviewer_id"])
        total_delta += ranks[rev["content"]["value"]] - ranks[prod["content"]["value"]]
    return {
        "divergence_census": census,
        "favourable_skew": {"favourable_count": len(recompute_events(bundle)), "comparable_pair_count": comparable_pairs},
        "concurrence_backing": {
            "backed_claim_count": len(bundle["concurrences"]),
            "total_concurrence_claim_count": len(bundle["concurrences"]),
        },
        "downgrade_depth": {"total_rank_delta": total_delta, "contested_pair_count": len(bundle["contest_history"])},
    }


def verify(evid=EVID):
    bundle = json.loads((evid / "bundle.json").read_text())
    cfg = json.loads((evid / "external-config.json").read_text())
    vpc = cfg["vpc_bundle"]

    ob = obligation_root(vpc)
    if bundle["rating_obligation_root"] != ob:
        return 334, {}
    stored = {
        (
            c["content"]["section_id"],
            c["content"]["reviewer_id"],
            c["content"]["producer_rating_digest"],
            c["content"]["reviewer_rating_digest"],
        )
        for c in bundle["contest_history"]
    }
    if stored != recompute_events(bundle):
        return 342, {}

    proj = projections(bundle)
    roots = {
        "rating_obligation_root": ob,
        "rating_ledger_root": ledger_root(bundle),
        "contest_layer_root": contest_layer_root(bundle),
        "projection_root": artifact_digest(proj),
    }
    if bundle["projections"]["projection_root"] != roots["projection_root"]:
        return 345, roots
    return 0, roots


if __name__ == "__main__":
    raw, roots = verify()
    print(json.dumps({"raw": raw, **({} if raw else roots)}))
    sys.exit(0 if raw == 0 else 1)
