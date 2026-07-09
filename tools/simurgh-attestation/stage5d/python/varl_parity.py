#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5D VARL — stdlib Python parity (plan Task 15). Motto: AnthropicSafe First, then ReviewerSafe.
# Independently reproduces the DETERMINISTIC public surface — applyRecipe, canonicalJson, the digest
# bindings — against the committed evidence, proving reconstruction is language-independent (anyone
# regenerates the exact bytes). No crypto lib needed (signature parity is the browser lane).
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
EVID = os.path.join(REPO, "docs/research/llm-shield/evidence/stage-5d")

CGJ = "͏"


def sha256(s: str) -> str:
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def canonical_json(obj) -> str:
    # Matches stage4m canonicalJson: sorted keys, no whitespace, unicode preserved.
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def apply_recipe(base: str, recipe) -> str:
    text = base
    for step in recipe:
        op = step["op"]
        args = step.get("args", {}) or {}
        if op == "fullwidth_digits":
            text = "".join(chr(0xFF10 + int(c)) if c.isdigit() else c for c in text)
        elif op == "percent_to_per_cent":
            text = text.replace("percent", "per cent")
        elif op in ("spell_number", "homoglyph_month"):
            for k in sorted((args.get("map") or {}).keys()):
                text = text.replace(k, args["map"][k])
        elif op == "combining_joiner":
            cps = list(text)
            for p in sorted(args.get("positions", []), reverse=True):
                cps.insert(p + 1, CGJ)
            text = "".join(cps)
        elif op == "cross_script_confusable":
            cps = list(text)
            for r in args.get("replacements", []):
                cps[r["index"]] = r["to"]
            text = "".join(cps)
        elif op == "literal":
            text = args["text"]
        else:
            raise ValueError(f"unknown recipe op: {op}")
    return text


def main() -> int:
    with open(os.path.join(EVID, "varl-ledger.json"), encoding="utf-8") as f:
        bundle = json.load(f)
    with open(os.path.join(EVID, "varl-audit-private.json"), encoding="utf-8") as f:
        audit = json.load(f)

    base_text = {b["base_id"]: b["base_text"] for b in bundle["base_corpus"]}
    checked = 0
    for rung in bundle["rungs"]:
        for e in rung["evasions"]:
            got = sha256(apply_recipe(base_text[e["base_id"]], e["recipe"]))
            assert got == e["evasion_digest"], f"evasion_digest mismatch {e['base_id']} r{rung['round']}"
            checked += 1

    # audit-private binding (253 surface)
    assert sha256(canonical_json(audit)) == bundle["audit_private_digest"], "audit_private_digest mismatch"
    for i, r in enumerate(audit["rounds"]):
        assert sha256(canonical_json(r)) == bundle["audit_private_round_digest_set"][i], "round digest mismatch"

    print(f"PARITY OK — {checked} evasion digests + audit-private binding reproduced in Python")
    return 0


if __name__ == "__main__":
    sys.exit(main())
