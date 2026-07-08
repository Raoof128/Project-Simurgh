# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5A VNC — Python parity (plan Task 12). Stdlib only. A SECOND independent implementation
# of the deterministic surface: the verdict rule (hits / polarity / unreadable precedence), the
# flag partition, the tally recount, token-id hygiene, and canonical JSON — so JS<->Python
# parity over the corpus is a real cross-impl check. Ed25519 is excluded (Node stays
# authoritative for signatures). Motto: AnthropicSafe First, then ReviewerSafe.
import hashlib
import json
import re
import sys

SAFE = 2**53 - 1
LEDGER_SCHEMA = "simurgh.vnc.ledger.v1"
TOKEN_RE = re.compile(r"^(0|[1-9][0-9]*)$")


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record_digest(obj):
    return "sha256:" + hashlib.sha256(canonical(obj).encode("utf-8")).hexdigest()


def parse_token_id(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, int):
        return str(v) if 0 <= v <= SAFE else None
    if isinstance(v, str):
        return v if TOKEN_RE.match(v) and int(v) <= SAFE else None
    return None


def addr_key(a):
    return (str(a["prompt_id"]), a["t"], a["layer"], int(a["token_id"]))


def flag_relation(m):
    out = []
    for c in m.get("cells", []):
        for tid in c.get("flags", []):
            out.append(
                {"prompt_id": c["prompt_id"], "t": c["t"], "layer": c["layer"], "token_id": parse_token_id(tid)}
            )
    out.sort(key=addr_key)
    return out


def declared_lexicon(m):
    s = set()
    for c in m.get("cells", []):
        for sc in c.get("scores", []):
            t = parse_token_id(sc["token_id"])
            if t is not None:
                s.add(t)
    return s


def claim_tokens(claim):
    return [parse_token_id(t) for t in claim.get("token_ids", [])]


def hits_for(claim, F):
    want = set(t for t in claim_tokens(claim) if t is not None)
    return [f for f in F if f["token_id"] in want]


def verdict_for(claim, m):
    lex = declared_lexicon(m)
    tokens = claim_tokens(claim)
    if any(t is None or t not in lex for t in tokens):
        return {"claim_id": claim["claim_id"], "verdict": "unreadable", "evidence": []}
    hits = hits_for(claim, flag_relation(m))
    if claim["polarity"] == "asserts_unflagged":
        verdict = "corroborated" if len(hits) == 0 else "contradicted"
    else:
        verdict = "corroborated" if len(hits) > 0 else "contradicted"
    return {"claim_id": claim["claim_id"], "verdict": verdict, "evidence": hits}


def classify(table, m):
    rows = [verdict_for(c, m) for c in table["content"]["claims"]]
    rows.sort(key=lambda r: r["claim_id"])
    return rows


def key_of(a):
    return f'{a["prompt_id"]} {a["t"]} {a["layer"]} {parse_token_id(a["token_id"])}'


def compute_unnarrated(verdicts, m):
    covered = set()
    for row in verdicts:
        for e in row.get("evidence", []):
            covered.add(key_of(e))
    return [f for f in flag_relation(m) if key_of(f) not in covered]


def tallies(verdicts, unnarrated):
    covered = set()
    for row in verdicts:
        for e in row.get("evidence", []):
            covered.add(key_of(e))
    n_cov = len(covered)
    return {
        "n_claims": len(verdicts),
        "n_corroborated": sum(1 for r in verdicts if r["verdict"] == "corroborated"),
        "n_contradicted": sum(1 for r in verdicts if r["verdict"] == "contradicted"),
        "n_unreadable": sum(1 for r in verdicts if r["verdict"] == "unreadable"),
        "n_flags": n_cov + len(unnarrated),
        "n_covered_flags": n_cov,
        "n_unnarrated_flags": len(unnarrated),
    }


def rebuild_ledger_content(bundle):
    narrative = bundle["narrative"]
    vwa = bundle["vwa"]
    table = bundle["claim_table"]
    verdicts = classify(table, vwa["map"])
    unnarrated = compute_unnarrated(verdicts, vwa["map"])
    content = {
        "schema": LEDGER_SCHEMA,
        "verdicts": verdicts,
        "unnarrated_flags": unnarrated,
        "claim_table_digest": record_digest(table),
        "narrative_digest": record_digest(narrative),
        "map_digest": record_digest(vwa["map"]),
        "map_attestation_digest": record_digest(vwa["attestation"]),
        "provenance": bundle["ledger"]["content"]["provenance"],
        "aggregates": {},
    }
    content["aggregates"] = tallies(verdicts, unnarrated)
    return content


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "canonical":
        print(canonical(json.loads(sys.argv[2])))
    else:
        bundle = json.loads(open(sys.argv[2], encoding="utf-8").read())
        if mode == "ledger":
            print(canonical(rebuild_ledger_content(bundle)))
        elif mode == "claim_digest":
            print(record_digest(bundle["claim_table"]))
        elif mode == "narrative_digest":
            print(record_digest(bundle["narrative"]))
        else:
            raise SystemExit(f"unknown mode: {mode}")
