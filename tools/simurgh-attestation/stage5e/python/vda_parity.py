#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5E VDA — stdlib Python parity (plan Task 15). Independently reproduces the DETERMINISTIC public
# surface — applyRecipe, the two slip booleans, the curve/FP counts, the fixed-width compare, and the
# score-table digest — against the committed evidence, proving reconstruction is language-independent.
# No crypto lib needed (the signature lane is the browser/Node verifier). NEVER runs the model.
import hashlib
import json
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
EVID = os.path.join(REPO, "docs/research/llm-shield/evidence/stage-5e")
CGJ = "͏"


def sha256(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def apply_recipe(base, recipe):
    text = base
    for step in recipe:
        op = step["op"]
        args = step.get("args", {}) or {}
        if op == "combining_joiner":
            cps = list(text)
            for p in sorted(args.get("positions", []), reverse=True):
                cps.insert(p + 1, CGJ)
            text = "".join(cps)
        elif op == "fullwidth_digits":
            text = "".join(chr(0xFF10 + int(c)) if c.isdigit() else c for c in text)
        elif op == "percent_to_per_cent":
            text = text.replace("percent", "per cent")
        else:
            raise ValueError("unexpected op in committed evidence: " + op)
    return text


def normalize_deobfuscated(text):
    n = unicodedata.normalize("NFKC", text)
    return "".join(c for c in n if not unicodedata.category(c).startswith("M"))


def dec_lt(a, b):
    return a < b  # fixed-width decimals: lexical == numeric


def main():
    with open(os.path.join(EVID, "vda-attestation.json"), encoding="utf-8") as f:
        bundle = json.load(f)
    base_text = {b["base_id"]: b["base_text"] for b in bundle["base_corpus"]}
    theta = bundle["detector"]["reference_threshold"]
    checked = 0

    # 1) every score-table entry is keyed by what the recipe actually produces
    for e in bundle["score_table"]["entries"]:
        obf = apply_recipe(base_text[e["base_id"]], e.get("recipe", []))
        text = normalize_deobfuscated(obf) if e["variant"] == "deobfuscated" else obf
        assert e["generated_text_digest"] == sha256(text), f"digest mismatch {e['base_id']}|{e['variant']}"
        checked += 1
    # score-table digest is language-independent
    assert bundle["score_table"]["digest"] == sha256(canonical_json(bundle["score_table"]["entries"])), "score_table.digest mismatch"

    def score_of(base_id, variant):
        for e in bundle["score_table"]["entries"]:
            if e["base_id"] == base_id and e["variant"] == variant:
                return e["score"]
        return None

    # 2) the two slip booleans recompute from the committed scores
    for ev in bundle["evasions"]:
        raw = score_of(ev["base_id"], "raw")
        evs = score_of(ev["base_id"], "evasion")
        crossing = dec_lt(evs, theta) and not dec_lt(raw, theta)
        inversion = dec_lt(evs, raw)
        assert ev["threshold_crossing"] == crossing, f"threshold_crossing {ev['base_id']}"
        assert ev["score_inversion"] == inversion, f"score_inversion {ev['base_id']}"
        checked += 2

    # 3) the curve and FP counts recompute
    entries = bundle["score_table"]["entries"]
    for p in bundle["evasion_threshold_curve"]:
        t = p["theta"]
        bf = sum(1 for e in entries if e["variant"] == "raw" and not dec_lt(e["score"], t))
        vf = sum(1 for e in entries if e["variant"] == "evasion" and not dec_lt(e["score"], t))
        assert p["bases_baseline_flagged"] == bf and p["variants_flagged"] == vf, f"curve {t}"
        checked += 1
    for p in bundle["benign_fp_curve"]:
        fp = sum(1 for q in bundle["benign_probe"] if not dec_lt(q["score"], p["theta"]))
        assert p["false_positives"] == fp, f"fp {p['theta']}"
        checked += 1

    slips = sum(1 for ev in bundle["evasions"] if ev["threshold_crossing"])
    print(f"PARITY OK — {checked} deterministic facts reproduced in Python; {slips} slip(s) at reference θ={theta}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
