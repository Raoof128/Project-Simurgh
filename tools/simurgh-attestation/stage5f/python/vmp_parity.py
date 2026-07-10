#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5F VMP — Python parity verifier (plan Task 20).
#
# Parity capability table (frozen):
#   INDEPENDENTLY REIMPLEMENTED in Python: canonicalJson byte-equality, the digest surface
#     (cell_matrix / capture_log / panel_plan), the omission-lower-bound arithmetic, and the LEXICAL
#     decimal-string verdict compare. These must byte-agree with the Node verifier.
#   SHARED KERNEL (NOT independent): raw 278's historical-verifier RUN is a vendored kernel invoked via
#     subprocess (orchestration parity), and is out of scope for this pure-arithmetic parity check.
#
# Scores are compared LEXICALLY over validated equal-width decimal strings — no float ever touches a
# verdict (matches constants.mjs scoreGte). Exit 0 iff Python corroborates the committed evidence.
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EVID = ROOT / "docs/research/llm-shield/evidence/stage-5f"
PLAN_DOMAIN_SEP = "simurgh.vmp.panel_plan.v1\n"
SCORE_RE = re.compile(r"^(0\.\d{4}|1\.0{4})$")


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_canon(value):
    return "sha256:" + hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def sha256_bytes(s):
    return "sha256:" + hashlib.sha256(s.encode("utf-8")).hexdigest()


def validate_score(s):
    if not isinstance(s, str) or not SCORE_RE.match(s):
        raise ValueError(f"invalid score {s!r}")
    return s


def score_gte(a, b):  # lexical — exact for equal-width [0,1] decimals
    return validate_score(a) >= validate_score(b)


def panel_plan_digest(obj):
    return sha256_bytes(PLAN_DOMAIN_SEP + canonical(obj))


def main():
    bundle = json.loads((EVID / "vmp-attestation.json").read_text())
    census = json.loads((EVID / "capture-census.json").read_text())
    receipt = json.loads((EVID / "laneb-receipt.json").read_text())
    fail = []

    # 1) digest surface agrees with the committed artifacts.
    if sha256_canon(bundle["cells"]) != receipt["cell_matrix_digest"]:
        fail.append("cell_matrix_digest")
    clog = sha256_canon(census)
    if clog != bundle["capture_provenance"]["capture_log_digest"] or clog != receipt["capture_log_digest"]:
        fail.append("capture_log_digest")

    roster = bundle["roster"]
    plan = panel_plan_digest(
        {
            "schema": bundle["schema"],
            "roster_digest": sha256_canon(roster),
            "corpus_digest": sha256_canon(bundle["corpus"]["cases"]),
            "applicability_digest": sha256_canon(bundle["applicability_matrix"]),
            "adapter_manifest_digest": sha256_canon(
                [
                    {
                        "member_id": m["member_id"],
                        "adapter_digest": m["adapter_digest"],
                        "tokenizer_manifest_digest": m["tokenizer_manifest_digest"],
                        "truncation_policy_digest": m["truncation_policy_digest"],
                    }
                    for m in roster
                ]
            ),
            "universe_digest": sha256_canon(bundle["detector_universe"]["candidates"]),
        }
    )
    if plan != bundle["roster_precommit"]["panel_plan_digest"]:
        fail.append("panel_plan_digest")

    # 2) coverage arithmetic.
    cov = bundle["coverage"]
    if cov["omission_lower_bound"] != cov["universe_size"] - cov["panel_size"]:
        fail.append("omission_lower_bound")

    # 3) lexical verdict parity for softmax cells.
    sem = {m["member_id"]: m for m in roster}
    for cell in bundle["cells"]:
        if cell["status"] != "evaluated":
            continue
        m = sem[cell["member_id"]]
        if m["decision_semantics"] != "binary_malicious_softmax":
            continue
        de = cell["decision_evidence"]
        expected = m["positive_label"] if score_gte(de["positive_score"], de["threshold"]) else m["label_map"][str(1 - m["positive_class_index"])]
        if de["label"] != expected:
            fail.append(f"verdict:{cell['member_id']}:{cell['case_id']}")

    result = {"python_parity": "corroborated" if not fail else "FAILED", "mismatches": fail}
    print(json.dumps(result))
    return 0 if not fail else 1


if __name__ == "__main__":
    sys.exit(main())
