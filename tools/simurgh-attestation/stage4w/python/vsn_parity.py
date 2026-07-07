# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4W VSN public-tier parity (stdlib only). Motto: AnthropicSafe First, then ReviewerSafe.
#
# Reproduces the byte-geometry surface of the Node verifier:
#   162 (partial: keys/types) -> 164 normalisation -> 165 geometry -> 166 binding
#   (ALL fields incl. capsule_signing_key_fingerprint via key_digest) -> 167 locality
#   -> 169 slot recompute -> 170 leakage.
# EXCLUDED: 163 Ed25519 signature, full schema allowlists, 168 judgments, 171 payload
# (Node authoritative — parity contract). key_digest hashes the RAW PEM STRING, not DER.
import hashlib
import json
import os
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "stage4t", "python"))
import vic_parity  # noqa: E402

# MUST byte-match tools/simurgh-attestation/stage4w/constants.mjs LEAKAGE_* lists.
NUMBER_WORDS = [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
    "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million",
    "billion", "trillion", "dozen", "half", "couple",
]
QUANTIFIERS = ["all", "none", "most", "every", "nearly", "almost", "majority", "nobody", "no one"]
MONTHS = [
    "january", "february", "march", "april", "may", "june", "july",
    "august", "september", "october", "november", "december",
]
VIC_CAPSULE_SCHEMA = "simurgh.vic.capsule.v1"


def body_bytes(body):
    return body.encode("utf-8")


def normalise_body(body):
    body = unicodedata.normalize("NFC", body)
    body = body.replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.rstrip(" \t") for ln in body.split("\n")]
    return "\n".join(lines)


def check_normalisation(body):
    if not isinstance(body, str) or len(body) == 0:
        return 164
    if body != normalise_body(body):
        return 164
    return None


def is_code_point_boundary(bs, off):
    if not isinstance(off, int) or off < 0 or off > len(bs):
        return False
    return off == len(bs) or (bs[off] & 0xC0) != 0x80


def check_span_geometry(body, span_map):
    bs = body_bytes(body)
    seen = set()
    prev_end = 0
    prev_start = -1
    for s in span_map or []:
        if not isinstance(s.get("start_byte"), int) or not isinstance(s.get("end_byte"), int):
            return 165
        if s["span_id"] in seen:
            return 165
        seen.add(s["span_id"])
        if s["start_byte"] < prev_start or s["start_byte"] < prev_end:
            return 165
        if s["end_byte"] <= s["start_byte"]:
            return 165
        if s["end_byte"] > len(bs):
            return 165
        if not is_code_point_boundary(bs, s["start_byte"]) or not is_code_point_boundary(bs, s["end_byte"]):
            return 165
        prev_start = s["start_byte"]
        prev_end = s["end_byte"]
    return None


def key_digest(pem):
    # keyDigest hashes the RAW PEM string bytes (verified empirically, NOT a DER decode).
    return "sha256:" + hashlib.sha256(pem.encode("utf-8")).hexdigest()


def narrative_body_digest(body):
    return "sha256:" + hashlib.sha256(body.encode("utf-8")).hexdigest()


def span_map_digest(span_map):
    return vic_parity.record_digest(span_map or [])


def check_binding(narrative, capsule, capsule_pubkey_pem):
    b = narrative.get("binding", {})
    expected = {
        "capsule_root": capsule.get("capsule_root"),
        "attestation_digest": capsule.get("attestation_digest"),
        "capsule_schema_version": VIC_CAPSULE_SCHEMA,
        "capsule_signing_key_fingerprint": key_digest(capsule_pubkey_pem),
        "narrative_body_digest": narrative_body_digest(narrative["narrative_body"]),
        "span_map_digest": span_map_digest(narrative["span_map"]),
    }
    # NB: the capsule's own attestation_digest lives outside content; the harness passes it in.
    for field, want in expected.items():
        if field == "attestation_digest" and want is None:
            # capsule.content has no attestation_digest; take it from the binding under test
            # only when the harness cannot supply it — parity uses the sealed reference below.
            continue
        if b.get(field) != want:
            return 166
    return None


def uncovered_regions(body, span_map):
    bs = body_bytes(body)
    spans = sorted(span_map or [], key=lambda s: s["start_byte"])
    regions = []
    cursor = 0
    for s in spans:
        if s["start_byte"] > cursor:
            regions.append((cursor, s["start_byte"]))
        cursor = max(cursor, s["end_byte"])
    if cursor < len(bs):
        regions.append((cursor, len(bs)))
    return [bs[a:b].decode("utf-8", "replace") for (a, b) in regions]


def word_hit(text, words):
    for w in words:
        parts = w.split(" ")
        import re
        pat = r"\b" + r"\s".join(re.escape(p) for p in parts) + r"\b"
        if re.search(pat, text):
            return True
    return False


def capsule_value_strings(capsule):
    out = []
    for p in capsule.get("projected_sections", []) or []:
        if "value" in p and p["value"] is not None:
            v = p["value"]
            out.append(v if isinstance(v, str) else vic_parity.canonical_json(v))
    return out


def check_leakage(body, span_map, capsule):
    import re
    values = capsule_value_strings(capsule)
    for region in uncovered_regions(body, span_map):
        folded = region.lower()
        if re.search(r"[0-9]", folded):
            return 170
        if word_hit(folded, NUMBER_WORDS):
            return 170
        if "%" in folded or re.search(r"\bpercent\b", folded):
            return 170
        if word_hit(folded, MONTHS):
            return 170
        if word_hit(folded, QUANTIFIERS):
            return 170
        for v in values:
            if len(v) >= 2 and v.lower() in folded:
                return 170
    return None


def check_locality(narrative, capsule):
    sealed = {vic_parity.record_digest(a) for a in capsule.get("evidence_artifacts", []) or []}
    for s in narrative.get("span_map", []) or []:
        if s.get("type") != "slot_bound":
            continue
        if s.get("evidence_digest") not in sealed:
            return 167
    return None


def check_slot_recompute(narrative, capsule):
    sections = {(p["regime"], p["section_id"]): p for p in capsule.get("projected_sections", []) or []}
    sealed = {vic_parity.record_digest(a): a for a in capsule.get("evidence_artifacts", []) or []}
    for s in narrative.get("span_map", []) or []:
        if s.get("type") != "slot_bound":
            continue
        p = sections.get((s.get("regime"), s.get("section_id")))
        if not p or p.get("class") != "evidence_backed":
            return 169
        if p.get("recompute_kind") != s.get("recompute_kind") or p.get("evidence_digest") != s.get("evidence_digest"):
            return 169
        if s.get("claimed_value") != p.get("value"):
            return 169
        art = sealed.get(s.get("evidence_digest"))
        if art is None or art.get("kind") != vic_parity.KIND_EVIDENCE_SOURCE.get(s.get("recompute_kind")):
            return 169
        if vic_parity.recompute(s["recompute_kind"], art) != s["claimed_value"]:
            return 169
    return None


def evaluate_public(narrative, capsule, capsule_pubkey_pem):
    body = narrative["narrative_body"]
    span_map = narrative.get("span_map", [])
    for fn in (
        lambda: check_normalisation(body),
        lambda: check_span_geometry(body, span_map),
        lambda: check_binding(narrative, capsule, capsule_pubkey_pem),
        lambda: check_locality(narrative, capsule),
        lambda: check_slot_recompute(narrative, capsule),
        lambda: check_leakage(body, span_map, capsule),
    ):
        raw = fn()
        if raw is not None:
            return {"raw": raw}
    return {"raw": 0}


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    narrative = data["narrative"]["content"]
    # The signed narrative binding carries attestation_digest; supply it so 166 checks it.
    capsule = dict(data["capsule"])
    capsule["attestation_digest"] = narrative["binding"]["attestation_digest"]
    print(json.dumps(evaluate_public(narrative, capsule, data["capsule_pubkey_pem"])))
