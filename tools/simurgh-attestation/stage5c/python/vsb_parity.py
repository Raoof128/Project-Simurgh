#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5C VSB - Python parity (plan Task 14). Motto: AnthropicSafe First, then ReviewerSafe.
# Reproduces the DETERMINISTIC PUBLIC SURFACE of the slip-ledger bundle using only the stdlib:
# cell-class partition consistency, No-Silent-Slip completeness, the exact-integer slip-rate,
# floor-monotonicity, and the severity_binding digest. The mutation engine (applyMR5C) and Ed25519
# stay Node-authoritative (a signed parity-contract line) - Python does not re-run them.
# FAMILY_OF MUST byte-match mrRuleset.mjs / stage4x metamorphicTable.mjs.
import hashlib
import json
import sys

# mr_id -> mr_family (imported 4X families == their ids; 5C-appended families likewise).
FAMILY_OF = {
    "digit_to_word_quantifier": "digit_to_word_quantifier",
    "exact_to_hedged": "exact_to_hedged",
    "percent_to_fraction_phrase": "percent_to_fraction_phrase",
    "date_to_relative": "date_to_relative",
    "count_to_bulk_phrase": "count_to_bulk_phrase",
    "true_semantic_paraphrase": "true_semantic_paraphrase",
    "voice_flip": "voice_flip",
    "unicode_confusable": "unicode_confusable",
    "guardrail_evasion": "guardrail_evasion",
}
CELL_CLASSES = ["caught", "slipped", "not_applicable", "degenerate"]


def canonical(obj):
    # Matches stage4m canonicalJson for the objects used here (sorted keys, no whitespace).
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_str(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def check(bundle):
    errors = []
    grid = bundle["grid"]
    base_mech = {b["base_id"]: b["mechanism"] for b in bundle["base_corpus"]}

    # partition: every cell_class is valid
    for c in grid:
        if c["cell_class"] not in CELL_CLASSES:
            errors.append("bad_cell_class:%s" % c["cell_class"])

    # No Silent Slip: slip_table keys == slipped grid cells
    slipped = {"%s|%s" % (c["mr_id"], c["base_id"]) for c in grid if c["cell_class"] == "slipped"}
    tabled = {"%s|%s" % (e["mr_id"], e["base_id"]) for e in bundle["slip_table"]}
    if slipped != tabled:
        errors.append("silent_slip_or_extra:%s" % sorted(slipped ^ tabled))

    # slip-rate: recompute per (mechanism, mr_family) from sealed grid; compare to published
    groups = {}
    for c in grid:
        if c["cell_class"] not in ("caught", "slipped"):
            continue
        key = (base_mech[c["base_id"]], FAMILY_OF[c["mr_id"]])
        g = groups.setdefault(key, {"caught": 0, "slipped": 0})
        g[c["cell_class"]] += 1
    recomputed = {}
    for (mech, fam), g in groups.items():
        recomputed[(mech, fam)] = (g["caught"], g["slipped"], g["slipped"], g["caught"] + g["slipped"])
    for r in bundle["slip_rates"]:
        key = (r["mechanism"], r["mr_family"])
        want = (r["caught"], r["slipped"], r["slip_rate_num"], r["slip_rate_den"])
        if recomputed.get(key) != want:
            errors.append("slip_rate_mismatch:%s" % (key,))
    if len(recomputed) != len(bundle["slip_rates"]):
        errors.append("slip_rate_count_mismatch")

    # floor monotonicity: the published boolean must be true
    for row in bundle["floor_monotonicity"]:
        if row["newer_slip_subset_of_older"] is not True:
            errors.append("floor_regression:%s" % row["mechanism"])

    # severity_binding: recompute from the slip_table
    rows = sorted(
        (
            {
                "mr_id": e["mr_id"],
                "base_id": e["base_id"],
                "severity": e["severity"],
                "severity_basis": e["severity_basis"],
            }
            for e in bundle["slip_table"]
        ),
        key=lambda r: "%s|%s" % (r["mr_id"], r["base_id"]),
    )
    if sha256_str(canonical(rows)) != bundle["binding"]["severity_binding"]:
        errors.append("severity_binding_mismatch")

    return errors


def main():
    path = sys.argv[1]
    with open(path, "r", encoding="utf-8") as f:
        bundle = json.load(f)
    errors = check(bundle)
    if errors:
        print("PARITY FAIL:", errors)
        sys.exit(1)
    print("PARITY OK: partition + slip-rate + floor + severity_binding reproduced")


if __name__ == "__main__":
    main()
