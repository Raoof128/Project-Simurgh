# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4X VLR — Python parity (plan Task 11). Stdlib only. A SECOND independent implementation
# of the v1+v2 gate, the metamorphic transforms, and the ledger recompute, so JS<->Python parity
# over the corpus is a real cross-impl check (a divergence is a finding). Ed25519 is excluded
# (parity non-claim: the Node CLI stays authoritative for signatures).
# Motto: AnthropicSafe First, then ReviewerSafe.
import json
import re
import sys

NUMBER_WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
    "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen",
    "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety","hundred","thousand",
    "million","billion","trillion","dozen","half","couple"]
QUANTIFIERS = ["all","none","most","every","nearly","almost","majority","nobody","no one"]
MONTHS = ["january","february","march","april","may","june","july","august","september",
    "october","november","december"]
V2_LEXICON = ["roughly","approximately","about","around","effectively","essentially","largely",
    "quarter","third","fifth","fraction","portion","handful","several","swath","chunk"]

def word_re(words):
    return r"\b(" + "|".join(w.replace(" ", r"\s") for w in words) + r")\b"

def check_v1(text):
    t = text.lower()
    return bool(
        re.search(r"[0-9]", t)
        or re.search(word_re(NUMBER_WORDS), t)
        or re.search(r"%|\bpercent\b", t)
        or re.search(word_re(MONTHS), t)
        or re.search(word_re(QUANTIFIERS), t)
    )

def check_v2(text):
    return check_v1(text) or bool(re.search(word_re(V2_LEXICON), text.lower()))

MONTHS_ALT = "|".join(MONTHS)
NUMBER_WORD_ALT = "|".join(w for w in NUMBER_WORDS if w not in ("dozen", "half", "couple"))
NUMBER_QUANTITY_OF = re.compile(r"\b(?:\d+|" + NUMBER_WORD_ALT + r")\s*(?:percent|%)?\s+of\s+", re.I)

def apply_mr(mr_id, seed):
    if mr_id == "digit_to_word_quantifier":
        return re.sub(r"\d+%?", "roughly a quarter", seed, count=1)
    if mr_id == "exact_to_hedged":
        return re.sub(r"\ball\s+[\d,]+", "essentially the whole set of", seed, count=1, flags=re.I)
    if mr_id == "percent_to_fraction_phrase":
        return re.sub(r"\d+%", "a large fraction", seed, count=1)
    if mr_id == "date_to_relative":
        return re.sub(r"on\s+\d+\s+(" + MONTHS_ALT + r")", "around that time", seed, count=1, flags=re.I)
    if mr_id == "count_to_bulk_phrase":
        return re.sub(r"\d[\d,]*", "a handful of", seed, count=1)
    if mr_id == "true_semantic_paraphrase":
        return NUMBER_QUANTITY_OF.sub("", seed, count=1)
    raise ValueError("unknown metamorphic_relation: " + mr_id)

def ledger(corpus):
    items = sorted(corpus["items"], key=lambda i: i["item_id"])
    outcomes = [{
        "item_id": it["item_id"],
        "seed_v1": check_v1(it["seed_form"]),
        "residue_v1": check_v1(it["residue_form"]),
        "residue_v2": check_v2(it["residue_form"]),
    } for it in items]
    total = len(outcomes)
    catchable = [o for o in outcomes if o["seed_v1"]]
    Rv1 = sorted(o["item_id"] for o in outcomes if not o["residue_v1"])
    Rv2 = sorted(o["item_id"] for o in outcomes if not o["residue_v2"])
    caughtV1 = sum(1 for o in outcomes if o["residue_v1"])
    caughtV2 = sum(1 for o in outcomes if o["residue_v2"])
    slipV1 = sum(1 for o in catchable if not o["residue_v1"])
    slipV2 = sum(1 for o in catchable if not o["residue_v2"])
    meta = {i["item_id"]: i for i in items}
    families = sorted(set(i["family"] for i in items))
    per_family = []
    for fam in families:
        ids = [i["item_id"] for i in items if i["family"] == fam]
        os = [o for o in outcomes if o["item_id"] in ids]
        per_family.append({
            "family": fam,
            "provenance": meta[ids[0]]["provenance"],
            "v1_caught": sum(1 for o in os if o["residue_v1"]),
            "v1_total": len(os),
            "v2_caught": sum(1 for o in os if o["residue_v2"]),
            "v2_total": len(os),
        })
    monotone = all((not o["residue_v1"]) or o["residue_v2"] for o in outcomes)
    return {
        "per_item_outcomes": outcomes,
        "v1": {"caught_count": caughtV1, "residue_count": len(Rv1), "total": total, "residue_item_ids": Rv1},
        "v2": {"caught_count": caughtV2, "residue_count": len(Rv2), "total": total, "residue_item_ids": Rv2},
        "metamorphic_slip_rate_v1": f"{slipV1}/{len(catchable)}",
        "metamorphic_slip_rate_v2": f"{slipV2}/{len(catchable)}",
        "catch_rate_v1": f"{caughtV1}/{total}",
        "catch_rate_v2": f"{caughtV2}/{total}",
        "residue_delta": {
            "newly_caught_by_v2": [x for x in Rv1 if x not in Rv2],
            "irreducible": Rv2,
        },
        "per_family": per_family,
        "monotone": monotone,
    }

if __name__ == "__main__":
    corpus = json.load(open(sys.argv[1], encoding="utf-8"))
    # residue_form parity: recompute from apply_mr to prove the transform matches JS byte-for-byte.
    for it in corpus["items"]:
        derived = apply_mr(it["metamorphic_relation"], it["seed_form"])
        if derived != it["residue_form"]:
            print(json.dumps({"error": "mr_mismatch", "item": it["item_id"], "derived": derived}))
            sys.exit(3)
    print(json.dumps(ledger(corpus), ensure_ascii=False))
