#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5H VSD — Python parity verifier. INDEPENDENT (stdlib-only) reimplementation of canonicalJson
# byte-equality, the domain-separated digest surface, the aggregate_mean recipe, and the tier lattice
# + warrant + inversion arithmetic. Must byte-agree with the Node verifier. Ed25519 signature
# verification is the JS side's job (predicate view of receipts: digest-linked-present, not sig-verified).
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5h"

DOMAIN = {
    "claim_inventory": "simurgh.vsd.claim_inventory.v1\n",
    "claim": "simurgh.vsd.claim.v1\n",
    "review_receipt": "simurgh.vsd.review_receipt.v1\n",
    "recompute_recipe": "simurgh.vsd.recompute_recipe.v1\n",
    "disclosure_attestation": "simurgh.vsd.disclosure_attestation.v1\n",
    "inventory_census": "simurgh.vsd.inventory_census.v1\n",
}
TIER = ["restricted", "controlled", "public"]
CONSEQUENCE = ["contextual", "supporting", "threshold_crossing"]
SUPPORT_QUALITY = {"restricted": "descriptive", "controlled": "qualified", "public": "full"}
MAX_CONSEQUENCE = {"restricted": "contextual", "controlled": "threshold_crossing", "public": "threshold_crossing"}


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def domain_digest(dom, obj):
    return sha256_hex(dom + canonical(obj))


def artifact_digest(obj):
    return sha256_hex(canonical(obj))


def identity_digest(identity):
    return artifact_digest(
        {"identity_subject": identity["identity_subject"], "key_fingerprint": identity["key_fingerprint"]}
    )


def parse_scaled(v, decimals):
    scale = 10 ** decimals
    neg = str(v).startswith("-")
    parts = str(v).replace("-", "").split(".")
    int_part = parts[0]
    frac = (parts[1] if len(parts) > 1 else "") + "0" * decimals
    frac = frac[:decimals]
    val = int(int_part or "0") * scale + int(frac or "0")
    return -val if neg else val


def format_scaled(scaled, decimals):
    scale = 10 ** decimals
    return f"{scaled // scale}.{str(scaled % scale).rjust(decimals, '0')}"


def aggregate_mean(values, decimals):
    n = len(values)
    total = sum(parse_scaled(v, decimals) for v in values)
    mean_scaled = (2 * total + n) // (2 * n)
    return format_scaled(mean_scaled, decimals)


def run_recipe(recipe, artefacts):
    values = []
    for aid in recipe["input_artefact_ids"]:
        values.extend(r["value"] for r in artefacts[aid]["rows"])
    return {"metric": recipe["metric"], "mean": aggregate_mean(values, recipe["decimals"]), "n": len(values)}


def main():
    bundle = json.loads((EVID / "vsd-attestation.json").read_text())
    recipes = json.loads((EVID / "recompute-recipe.json").read_text())
    inv = bundle["claim_inventory"]
    claims = inv["content"]["claims"]
    artefacts = {a["artefact_id"]: json.loads((EVID / a["path"]).read_text()) for a in bundle["artefacts_ref"]}
    fail = []

    if identity_digest(bundle["producer_identity"]) != inv["content"]["producer_identity_digest"]:
        fail.append("producer_identity_digest")

    for a in bundle["artefacts_ref"]:
        if artifact_digest(artefacts[a["artefact_id"]]) != a["digest"]:
            fail.append(f"artefact_digest:{a['artefact_id']}")

    for c in claims:
        if c.get("recompute"):
            if domain_digest(DOMAIN["recompute_recipe"], recipes[c["claim_id"]]) != c["recompute"]["recipe_digest"]:
                fail.append(f"recipe_digest:{c['claim_id']}")

    # recompute result for public claims
    recompute = {}
    for c in claims:
        if c["declared_tier"] == "public" and c.get("recompute"):
            out = run_recipe(recipes[c["claim_id"]], artefacts)
            recompute[c["claim_id"]] = artifact_digest(out) == c["recompute"]["committed_output_digest"]

    # receipts by claim_digest (predicate view: present == digest-linked)
    receipts = {r["content"]["claim_digest"]: r["content"] for r in bundle["review_receipts"]}

    table = []
    for c in claims:
        cd = domain_digest(DOMAIN["claim"], c)
        receipt = receipts.get(cd)
        has_method = c.get("method_summary_digest") is not None
        withheld_empty = len(c["artefact_manifest"]["withheld"]) == 0
        r1 = has_method and receipt is not None and receipt["verdict"] == "reproduced"
        r2 = has_method and withheld_empty and recompute.get(c["claim_id"]) is True
        proven = "public" if r2 else "controlled" if r1 else "restricted"
        maxc = MAX_CONSEQUENCE[proven]
        dist = max(0, CONSEQUENCE.index(c["declared_consequence"]) - CONSEQUENCE.index(maxc))
        table.append({
            "claim_id": c["claim_id"],
            "proven_tier": proven,
            "support_quality": SUPPORT_QUALITY[proven],
            "max_consequence_warranted": maxc,
            "inverted": dist > 0,
            "right_scaling_distance": dist,
        })

    key = lambda rows: canonical(sorted(rows, key=lambda r: r["claim_id"]))
    if key(table) != key(bundle["verdict_table"]):
        fail.append("verdict_table")

    census = {
        "claim_ids": sorted(c["claim_id"] for c in claims),
        "artefact_ids": sorted(a["artefact_id"] for a in bundle["artefacts_ref"]),
    }
    if domain_digest(DOMAIN["inventory_census"], census) != bundle["inventory_census_digest"]:
        fail.append("inventory_census_digest")

    print(json.dumps({"vsd_parity": "corroborated" if not fail else "FAILED", "mismatches": fail}))
    return 0 if not fail else 1


if __name__ == "__main__":
    sys.exit(main())
