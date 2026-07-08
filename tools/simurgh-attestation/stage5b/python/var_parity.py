# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5B VAR — Python parity (plan Task 13). Stdlib only. A SECOND independent implementation
# of the deterministic surface: the tally recount, the ASR fraction (denominator = survived +
# bypass), the Signed-Floor reconciliation, and canonical JSON — so JS<->Python parity over the
# corpus is a real cross-impl check. Ed25519 + the drivers stay Node-authoritative. Motto:
# AnthropicSafe First, then ReviewerSafe.
import json
import re
import sys

FAMILIES = [
    "conflict_laundering",
    "residue_paraphrase_slip",
    "silent_cell_hide",
    "narrative_span_forgery",
    "precommit_backdate",
    "crypto_signature",
    "capture_substitution",
]
FAM_RE = re.compile(r":([a-z_]+)#\d+$")


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def family_of(attack_id):
    m = FAM_RE.search(attack_id or "")
    return m.group(1) if m else None


def compute_asr(findings):
    bypasses = sum(1 for f in findings if f["outcome"] == "bypass")
    scored = sum(1 for f in findings if f["outcome"] in ("bypass", "survived"))
    return "%d/%d" % (bypasses, scored)


def tallies(findings):
    per_family = {fam: 0 for fam in FAMILIES}
    t = {
        "n_attacks": len(findings),
        "survived": 0,
        "bypass": 0,
        "model_refused": 0,
        "lane_disabled": 0,
        "per_family": per_family,
    }
    for f in findings:
        if f["outcome"] in t:
            t[f["outcome"]] += 1
        fam = f.get("family") or family_of(f["attack_id"])
        if fam in per_family:
            per_family[fam] += 1
    t["asr"] = compute_asr(findings)
    return t


def floor_reconcile(findings, floors):
    out = {}
    for gate, floor in floors.items():
        bypasses = [
            f
            for f in findings
            if f.get("family") == "residue_paraphrase_slip"
            and f.get("target_stage") == gate
            and f["outcome"] == "bypass"
        ]
        new_findings = sum(1 for f in bypasses if f.get("new_finding") is True)
        within = len(bypasses) - new_findings
        out[gate] = {
            "bypasses": len(bypasses),
            "floor": floor,
            "new_findings": new_findings,
            "status": "corroborated" if within <= floor else "exceeded",
        }
    return out


if __name__ == "__main__":
    mode = sys.argv[1]
    bundle = json.loads(open(sys.argv[2], encoding="utf-8").read())
    findings = bundle["findings"]
    if mode == "tallies":
        print(canonical(tallies(findings)))
    elif mode == "asr":
        print(compute_asr(findings))
    elif mode == "floor":
        print(canonical(floor_reconcile(findings, bundle.get("floors", {}))))
    else:
        raise SystemExit("unknown mode: %s" % mode)
