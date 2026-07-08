# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 4Y VDR — Python parity (plan Task 12). Stdlib only. A SECOND independent implementation
# of the 183 intrinsic checks, the extractor, the precedence partition, the shadow replay, and
# the public map — so JS<->Python parity over the corpus is a real cross-impl check. The digest
# PREFLIGHT (v1/v2/MR table) must match the JS frozen block BEFORE any map compare, so parity
# means "same rules, same bytes, same map". Ed25519 is excluded (Node stays authoritative).
# Motto: AnthropicSafe First, then ReviewerSafe.
import hashlib
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

REGION_CLASSES = ["caught_v1", "caught_v2_only", "redacted", "unflagged"]
RANK = {"redacted": 0, "caught_v1": 1, "caught_v2_only": 2, "unflagged": 3}
CLASS_BY_RANK = ["redacted", "caught_v1", "caught_v2_only", "unflagged"]


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(s):
    if isinstance(s, str):
        s = s.encode("utf-8")
    return "sha256:" + hashlib.sha256(s).hexdigest()


# ---- frozen digests (must equal the JS block) ----
def v1_ruleset_digest():
    return sha(canonical({"id": "vsn.leakage.v1", "numberWords": NUMBER_WORDS,
                          "quantifiers": QUANTIFIERS, "months": MONTHS}))


def v2_digest():
    return sha(canonical({"id": "vsn.leakage.v2",
                          "v1": {"numberWords": NUMBER_WORDS, "quantifiers": QUANTIFIERS, "months": MONTHS},
                          "v2Lexicon": V2_LEXICON}))


MR_RELATIONS = [
    ("digit_to_word_quantifier", "replace first /\\d+%?/ with 'roughly a quarter'"),
    ("exact_to_hedged", "replace first /all\\s+[\\d,]+/ with 'essentially the whole set of'"),
    ("percent_to_fraction_phrase", "replace first /\\d+%/ with 'a large fraction'"),
    ("date_to_relative", "replace first /on \\d+ <Month>/ with 'around that time'"),
    ("count_to_bulk_phrase", "replace first /\\d[\\d,]*/ with 'a handful of'"),
    ("true_semantic_paraphrase",
     "drop /(digit|number-word)\\s*(percent|%)?\\s+of\\s+/ (quantity removed, claim preserved)"),
]
MR_IDS = [r[0] for r in MR_RELATIONS]


def metamorphic_table_digest():
    relations = [{"id": i, "family": i, "pattern": p} for (i, p) in MR_RELATIONS]
    return sha(canonical({"id": "vlr.metamorphic.v1", "relations": relations}))


SOURCE_FILES = [
    "tools/simurgh-attestation/stage4w/core/leakageGate.mjs",
    "tools/simurgh-attestation/stage4w/constants.mjs",
    "tools/simurgh-attestation/stage4x/core/gateV2.mjs",
    "tools/simurgh-attestation/stage4x/core/metamorphicTable.mjs",
]


def source_witness_digest(root):
    witness = {}
    for rel in SOURCE_FILES:
        with open(root + "/" + rel, "rb") as f:
            witness[rel] = sha(f.read())
    return sha(canonical(witness))


def frozen_block(root):
    return {"v1_ruleset_digest": v1_ruleset_digest(), "v2_digest": v2_digest(),
            "metamorphic_table_digest": metamorphic_table_digest(),
            "source_witness_digest": source_witness_digest(root)}


# ---- gates (whole-body predicates) ----
def word_re(words):
    return re.compile(r"\b(" + "|".join(w.replace(" ", r"\s") for w in words) + r")\b", re.I)


V1_MATCHERS = [re.compile(r"[0-9]+"), word_re(NUMBER_WORDS), re.compile(r"%|\bpercent\b", re.I),
               word_re(MONTHS), word_re(QUANTIFIERS)]
V2_MATCHER = word_re(V2_LEXICON)


def fires_v1(text):
    return any(m.search(text) for m in V1_MATCHERS)


def fires_v2(text):
    return fires_v1(text) or bool(V2_MATCHER.search(text))


# ---- extractor (byte offsets) ----
def byte_off(text, char_idx):
    return len(text[:char_idx].encode("utf-8"))


def extract_spans(text):
    spans = []
    for m in V1_MATCHERS:
        for mt in m.finditer(text):
            spans.append((byte_off(text, mt.start()), byte_off(text, mt.end()), "caught_v1"))
    for mt in V2_MATCHER.finditer(text):
        spans.append((byte_off(text, mt.start()), byte_off(text, mt.end()), "caught_v2_only"))
    spans.sort(key=lambda s: (s[0], s[1]))
    return spans


# ---- partition ----
def build_partition(byte_len, spans, manifest):
    rank = [3] * byte_len
    def paint(s, e, r):
        for i in range(max(0, s), min(byte_len, e)):
            if r < rank[i]:
                rank[i] = r
    for (s, e, cls) in spans:
        paint(s, e, RANK[cls])
    for m in manifest:
        paint(m["offset"], m["offset"] + m["length"], RANK["redacted"])
    regions = []
    i = 0
    while i < byte_len:
        r = rank[i]
        j = i + 1
        while j < byte_len and rank[j] == r:
            j += 1
        regions.append({"offset": i, "length": j - i, "class": CLASS_BY_RANK[r]})
        i = j
    return regions


def aggregates_for(regions):
    b = {c: 0 for c in REGION_CLASSES}
    n = {c: 0 for c in REGION_CLASSES}
    for r in regions:
        b[r["class"]] += r["length"]
        n[r["class"]] += 1
    return b, n


# ---- shadow ----
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
    raise ValueError("unknown mr: " + mr_id)


def compute_shadow(region_text):
    recs = []
    for mr_id in MR_IDS:
        variant = apply_mr(mr_id, region_text)
        if variant == region_text:
            recs.append({"mr_id": mr_id, "applicable": False})
        else:
            recs.append({"mr_id": mr_id, "applicable": True, "variant_digest": sha(variant),
                         "slips_v1": not fires_v1(variant), "slips_v2": not fires_v2(variant)})
    return recs


def caught_lines(data, spans):
    ranges = []
    start = 0
    for i, byte in enumerate(data):
        if byte == 0x0A:
            ranges.append((start, i + 1))
            start = i + 1
    if start < len(data):
        ranges.append((start, len(data)))
    if not ranges and len(data) > 0:
        ranges.append((0, len(data)))
    out = []
    for (s, e) in ranges:
        if any(sp[0] < e and sp[1] > s for sp in spans):
            out.append(data[s:e].decode("utf-8"))
    return out


def build_map(data, manifest, salt, root):
    text = data.decode("utf-8")
    spans = extract_spans(text)
    regions = build_partition(len(data), spans, manifest)
    lines = caught_lines(data, spans)
    per = [compute_shadow(l) for l in lines]
    a = sum(1 for recs in per for r in recs if r["applicable"])
    k1 = sum(1 for recs in per for r in recs if r["applicable"] and r["slips_v1"])
    k2 = sum(1 for recs in per for r in recs if r["applicable"] and r["slips_v2"])
    b, n = aggregates_for(regions)
    unredacted = [r for r in regions if r["class"] != "redacted"]
    commitment = "sha256:" + hashlib.sha256(str(salt).encode("utf-8") + data).hexdigest()
    return {
        "schema": "simurgh.vdr.map.v1",
        "document_byte_length": len(data),
        "document_commitment": commitment,
        "regions": regions,
        "aggregates": {"bytes_by_class": b, "span_counts_by_class": n,
                       "shadow": {"n_caught_regions": len(lines), "a_applicable_variants": a,
                                  "k_slip_v1": k1, "k_slip_v2": k2}},
        "frozen": frozen_block(root),
        "reconciliation": {"redaction_region_count": sum(1 for r in regions if r["class"] == "redacted"),
                           "unredacted_segment_count": len(unredacted),
                           "segment_class_sequence": [r["class"] for r in unredacted]},
        "provenance": "fixture",
    }


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "digests":
        print(canonical({"v1_ruleset_digest": v1_ruleset_digest(), "v2_digest": v2_digest(),
                         "metamorphic_table_digest": metamorphic_table_digest()}))
    elif mode == "map":
        doc_path, salt, manifest_json, root = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
        with open(doc_path, "rb") as f:
            data = f.read()
        manifest = json.loads(manifest_json)
        print(canonical(build_map(data, manifest, salt, root)))
