#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 5Q — the deterministic surface, mirrored in Python (Task 19.5).

AN INDEPENDENT RECOMPUTE, NOT A TRANSLATION OF THE JAVASCRIPT.

The value of a second runtime is that it disagrees when the first one is wrong. A mirror written by
transliterating the JS line by line inherits the JS's assumptions and agrees with it for the same
reasons — which is agreement that proves nothing. So this file is written from the SPEC:
domain-separated SHA-256 with a 0x00 separator, byte-level source canonicalisation, key-sorted
canonical JSON, a Merkle tree whose odd leaf is promoted rather than duplicated.

Where Python and JavaScript genuinely differ, the difference is handled explicitly and named:

  canonical JSON     `json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)` is the
                     mirror of `JSON.stringify` over a recursively key-sorted object. The two agree
                     on strings, integers, arrays and plain objects. They DISAGREE on floats and on
                     non-BMP escaping, so neither is in the parity surface — stated in the vectors
                     file rather than left to be discovered.

  key ordering       Python sorts str by code point; JS `Array.prototype.sort` compares UTF-16 code
                     units. These differ only above U+FFFF, which the surface excludes.

  bytes vs text      every input that represents source arrives as a byte array. A str has already
                     lost the distinction between malformed UTF-8 and U+FFFD.

Usage:
    python3 vsr_parity.py [path/to/parity-vectors.json]   ->  JSON on stdout, one key per vector
"""

import hashlib
import json
import sys
from pathlib import Path

DOMAIN_SOURCE_SPAN = "simurgh.vsr.source-span.v1"
DOMAIN_CLOSURE_MEMBER = "simurgh.vsr.closure-member.v1"
DOMAIN_MERKLE_LEAF = "simurgh.vuc.leaf.v1"
DOMAIN_MERKLE_NODE = "simurgh.vuc.node.v1"

SEP = ":"

COVERAGE_STATUSES = (
    "attacked_pass",
    "finding_frozen",
    "mechanically_unreachable",
    "delegated_to_attacked_caller",
)

# `delegated` is deliberately absent: a delegated cell is reachable through a caller that carries
# the obligation, and whether that caller was attacked is a separate question.
MECHANICAL_OMISSION_REASONS = (
    "no_such_input_surface",
    "no_trust_decision",
    "no_persistent_state",
    "single_runtime",
    "not_in_historical_closure",
)

COMMITMENT_FIELDS = (
    "function_id",
    "stage_id",
    "module_path",
    "export_name_or_internal_symbol",
    "source_digest",
    "category",
    "reachable_from",
    "security_role",
    "historical_tags",
)


def domain_digest(domain: str, payload: bytes) -> bytes:
    """SHA256( UTF8(domain) || 0x00 || payload ).

    The 0x00 is not decoration: without it a domain ending in "ab" over content "c" hashes
    identically to a domain ending in "a" over content "bc".
    """
    return hashlib.sha256(domain.encode("utf-8") + b"\x00" + payload).digest()


def canonical_json(value) -> str:
    """Key-sorted, separator-tight, non-ASCII left as-is."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def canonical_source_bytes(data: bytes) -> bytes:
    """Spec §2.5. BOM REJECTED rather than stripped; CRLF and lone CR to LF; one trailing LF."""
    if data[:3] == b"\xef\xbb\xbf":
        raise ValueError("source digest: BOM present; canonical source bytes reject a BOM")
    text = data.decode("utf-8")  # strict by default — malformed UTF-8 raises rather than becoming U+FFFD
    if text[:1] == "﻿":
        raise ValueError("source digest: BOM present; canonical source bytes reject a BOM")
    lf = text.replace("\r\n", "\n").replace("\r", "\n")
    if not lf.endswith("\n"):
        lf += "\n"
    return lf.encode("utf-8")


def source_span_digest(data: bytes) -> str:
    return domain_digest(DOMAIN_SOURCE_SPAN, canonical_source_bytes(data)).hex()


def make_function_id(parts: dict) -> str:
    stage_id, module_path, symbol = parts["stageId"], parts["modulePath"], parts["symbol"]
    if not stage_id or not module_path or not symbol:
        raise ValueError("function id: stageId, modulePath and symbol are all required")
    if SEP in module_path:
        raise ValueError(f"function id: module path must not contain '{SEP}': {module_path}")
    if SEP in stage_id:
        raise ValueError(f"function id: stage id must not contain '{SEP}': {stage_id}")
    return f"{stage_id}{SEP}{module_path}{SEP}{symbol}"


def parse_function_id(text: str) -> dict:
    """Bounded to the first two separators, NOT greedy: a verifier-branch symbol contains ':'."""
    first = text.find(SEP)
    second = text.find(SEP, first + 1) if first != -1 else -1
    if first == -1 or second == -1:
        raise ValueError(f"function id: malformed, expected stage:path:symbol — got {text}")
    return {
        "stageId": text[:first],
        "modulePath": text[first + 1 : second],
        "symbol": text[second + 1 :],
    }


def closure_leaf_hash(row: dict) -> str:
    """The commitment projection is EXACTLY the nine fields; a tenth must not move the leaf."""
    projected = {field: row.get(field) for field in COMMITMENT_FIELDS}
    # Field ORDER, not sorted: the JS builds this object in COMMITMENT_FIELDS order and stringifies
    # it directly. Python dicts preserve insertion order, so the two produce the same bytes.
    member_digest = domain_digest(
        DOMAIN_CLOSURE_MEMBER,
        json.dumps(projected, separators=(",", ":"), ensure_ascii=False).encode("utf-8"),
    ).hex()
    payload = canonical_json(
        {
            "leaf_id": row["function_id"],
            "leaf_type": "closure_member",
            "subject_digest": f"sha256:{member_digest}",
        }
    )
    return domain_digest(DOMAIN_MERKLE_LEAF, payload.encode("utf-8")).hex()


def merkle_root_hex(leaf_hexes) -> str:
    """Order-sensitive. The odd leaf at the end of a level is PROMOTED, never duplicated."""
    if not leaf_hexes:
        raise ValueError("empty merkle tree")
    level = [bytes.fromhex(h) for h in leaf_hexes]
    while len(level) > 1:
        nxt = []
        for i in range(0, len(level), 2):
            if i + 1 < len(level):
                nxt.append(domain_digest(DOMAIN_MERKLE_NODE, level[i] + level[i + 1]))
            else:
                nxt.append(level[i])
        level = nxt
    return level[0].hex()


def derive_coverage_status(cells, delegates_to=None):
    """Annex A4.3. Returns one of the four statuses or None.

    None is an ANSWER, not a missing value: a member whose obligated cells were never attacked has
    no status, and defaulting it would be the false green this stage is named after.
    """
    if not cells:
        return None
    if any((c.get("finding_count") or 0) > 0 for c in cells):
        return "finding_frozen"

    obligated = [c for c in cells if c.get("applicability") == "obligated"]
    omitted = [c for c in cells if c.get("applicability") == "omitted"]

    if not obligated:
        if all(c.get("omission_reason") in MECHANICAL_OMISSION_REASONS for c in omitted):
            return "mechanically_unreachable"
        return "delegated_to_attacked_caller" if delegates_to else None

    undischarged = [c for c in obligated if not c.get("discharged")]
    not_passing = [
        c for c in obligated if c.get("discharged") and c.get("discharge_status") != "attacked_pass"
    ]
    if not undischarged and not not_passing:
        return "attacked_pass"
    if delegates_to and len(undischarged) == len(obligated):
        return "delegated_to_attacked_caller"
    return None


def evaluate_vectors(vectors) -> dict:
    out = {}
    for v in vectors:
        kind = v["kind"]
        if kind == "source_span_digest":
            out[v["id"]] = source_span_digest(bytes(v["bytes"]))
        elif kind == "canonical_source_bytes":
            out[v["id"]] = list(canonical_source_bytes(bytes(v["bytes"])))
        elif kind == "function_id":
            out[v["id"]] = make_function_id(v["parts"])
        elif kind == "parse_function_id":
            out[v["id"]] = parse_function_id(v["id_text"])
        elif kind == "canonical_json":
            out[v["id"]] = canonical_json(v["value"])
        elif kind == "closure_leaf":
            out[v["id"]] = closure_leaf_hash(v["row"])
        elif kind == "merkle_root":
            out[v["id"]] = merkle_root_hex(v["leaves"])
        elif kind == "coverage_status":
            out[v["id"]] = derive_coverage_status(v["cells"], v.get("delegates_to"))
        else:
            raise ValueError(f"unknown vector kind: {kind}")
    return out


def main(argv) -> int:
    here = Path(__file__).resolve().parent
    path = Path(argv[1]) if len(argv) > 1 else here / "parity-vectors.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    results = evaluate_vectors(doc["vectors"])
    # Sorted so two runs on two machines produce byte-identical stdout.
    print(json.dumps(results, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
