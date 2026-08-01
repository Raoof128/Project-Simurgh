# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Stage 5S — Task 28 — the Python mirror.
#
# It reproduces the same seven surfaces the parity manifest names, from the same committed vectors,
# and prints canonical JSON so the comparison is byte-level rather than "looks the same".
#
# A RUNTIME THAT FAILS TO LAUNCH IS A REFUSAL, NEVER A SKIP. This file is invoked by the parity test
# and its absence or failure reddens; there is no `if python3 exists` branch anywhere, because that
# branch is how a parity claim quietly becomes a claim about one runtime.

import hashlib
import json
import sys

PARITY_IDS = [
    "canonical_json",
    "checkpoint_body_digest",
    "checkpoint_envelope_digest",
    "compatibility_relation",
    "ancestry",
    "quorum_arithmetic",
    "typed_status_rendering",
]

SIGNATURE_FIELDS = (
    "producer_signature",
    "producer_signature_profile",
    "witness_statements",
    "receipts",
)
BODY_DOMAIN = "simurgh.vwq.checkpoint-body.v1"
ENVELOPE_DOMAIN = "simurgh.vwq.checkpoint-envelope.v1"


def canonical_json(value):
    """Sorted keys, no whitespace — the same bytes the other runtimes emit, or nothing works."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def checkpoint_body_digest(checkpoint):
    body = {k: v for k, v in checkpoint.items() if k not in SIGNATURE_FIELDS}
    return sha256_hex(BODY_DOMAIN + "\n" + canonical_json(body))


def checkpoint_envelope_digest(checkpoint):
    return sha256_hex(ENVELOPE_DOMAIN + "\n" + canonical_json(checkpoint))


def prove_ancestry(earlier, later, committed):
    chain = committed.get("chain") or []
    index = {r["body_digest"]: r for r in chain}
    target = earlier.get("checkpoint_body_digest")
    if not isinstance(target, str):
        return "unprovable"
    if later.get("checkpoint_body_digest") == target:
        return "proven"
    current = index.get(later.get("checkpoint_body_digest"))
    if current is None:
        return "unprovable"

    seen = set()
    while True:
        if current["body_digest"] in seen:
            return "invalid"
        seen.add(current["body_digest"])
        predecessor = current.get("predecessor")
        if predecessor is None:
            return "not_ancestor"
        if predecessor in seen:
            return "invalid"
        nxt = index.get(predecessor)
        if nxt is None:
            return "unprovable"
        if not nxt["epoch"] < current["epoch"]:
            return "invalid"
        if predecessor == target:
            return "proven"
        current = nxt


def malformed_view(v):
    """The fields the relation reads. The core refuses their absence at SCHEMA_UNSUPPORTED."""
    if not isinstance(v, dict):
        return "not an object"
    for field in ("producer_identity", "scope_id", "checkpoint_body_digest"):
        if not isinstance(v.get(field), str) or not v.get(field):
            return field + " absent"
    if not isinstance(v.get("epoch"), int) or isinstance(v.get("epoch"), bool):
        return "epoch is not an integer"
    return None


def compare(a, b, ancestry):
    """`ancestry` returns {"verdict": ...} — the Node core's contract, adopted verbatim."""
    for label, v in (("a", a), ("b", b)):
        why = malformed_view(v)
        if why:
            return "refused:SCHEMA_UNSUPPORTED"

    if a.get("producer_identity") != b.get("producer_identity") or a.get("scope_id") != b.get("scope_id"):
        return "refused:COMPARISON_SET_INSUFFICIENT"
    if a.get("checkpoint_body_digest") == b.get("checkpoint_body_digest"):
        return "same_checkpoint"
    if a.get("epoch") == b.get("epoch"):
        return "incompatible"
    earlier, later = (a, b) if a["epoch"] < b["epoch"] else (b, a)
    answer = ancestry(earlier, later)
    verdict = answer.get("verdict") if isinstance(answer, dict) else None
    if verdict == "proven":
        return "compatible"
    if verdict == "not_ancestor":
        return "incompatible"
    if verdict == "invalid":
        return "refused:ANCESTRY_PROOF_INVALID"
    return "indeterminate"


def tally(payload):
    checkpoint = payload.get("checkpoint") or {}
    policy = payload.get("policy") or {}
    statements = payload.get("statements") or []
    producer_key_digest = payload.get("producer_key_digest")
    roster = policy.get("witness_roster") or []
    seat_of = {e["witness_identity"]: e for e in roster}
    owner_of_key = {e["key_digest"]: e["witness_identity"] for e in roster}

    refusals = []
    eligible = []
    for s in statements:
        if not s.get("witness_identity") or not s.get("key_digest"):
            refusals.append("WITNESS_IDENTITY_MALFORMED")
            continue
        if s.get("signature_verified") is not True:
            refusals.append("WITNESS_SIGNATURE_INVALID")
            continue
        seat = seat_of.get(s["witness_identity"])
        if seat is None:
            refusals.append("WITNESS_NOT_IN_ROSTER")
            continue
        if seat["key_digest"] != s["key_digest"]:
            # 5S-F010: an authorised key on the wrong authorised identity is an alias, not a stranger.
            refusals.append(
                "WITNESS_KEY_ALIASED" if s["key_digest"] in owner_of_key else "WITNESS_NOT_IN_ROSTER"
            )
            continue
        if s["witness_identity"] == checkpoint.get("producer_identity") or (
            producer_key_digest and s["key_digest"] == producer_key_digest
        ):
            refusals.append("PRODUCER_SELF_WITNESS")
            continue
        eligible.append(s)

    identities = sorted({s["witness_identity"] for s in eligible})
    threshold = policy.get("threshold_q")
    # A shortfall is a refusal at the TALLY (496); Ruling 8 governs the evaluator, not the arithmetic.
    if not isinstance(threshold, int) or len(identities) < threshold:
        refusals.append("QUORUM_BELOW_POLICY")
    return {
        "ok": len(refusals) == 0,
        "distinct": len(identities),
        "met": isinstance(threshold, int) and len(identities) >= threshold,
    }


def comparison_status_of(context):
    relations = context.get("relations") or []
    if not relations:
        return "comparison_unavailable"
    if (context.get("intake") or {}).get("sufficient_for_comparison") is not True:
        return "comparison_unavailable"
    if "incompatible" in relations:
        return "equivocation_detected"
    if any(r not in ("same_checkpoint", "compatible") for r in relations):
        return "comparison_indeterminate"
    return "no_conflict_in_committed_comparison_set"


def artifact_status_of(context):
    relations = context.get("relations") or []
    status = context.get("comparison_status")
    if status == "equivocation_detected":
        return "present"
    if status == "comparison_indeterminate":
        return "absent_comparison_indeterminate"
    if status == "comparison_unavailable":
        return "absent_comparison_unavailable"
    if status == "no_conflict_in_committed_comparison_set":
        if not relations:
            return "absent_comparison_unavailable"
        return "absent_same_checkpoint" if all(r == "same_checkpoint" for r in relations) else "absent_compatible"
    return "absent_comparison_unavailable"


def run_vectors(vectors):
    statuses = []
    for v in vectors["statuses"]:
        comparison = comparison_status_of(v)
        statuses.append(
            {"comparison": comparison, "artifact": artifact_status_of({**v, "comparison_status": comparison})}
        )
    return {
        "runtime": "python",
        "covered": list(PARITY_IDS),
        "canonical_json": [canonical_json(v) for v in vectors["canonical"]],
        "checkpoint_body_digest": [checkpoint_body_digest(c) for c in vectors["checkpoints"]],
        "checkpoint_envelope_digest": [checkpoint_envelope_digest(c) for c in vectors["checkpoints"]],
        "compatibility_relation": [
            compare(
                p["a"],
                p["b"],
                lambda e, l, p=p: {"verdict": prove_ancestry(e, l, p.get("committed") or {})},
            )
            for p in vectors["comparisons"]
        ],
        "ancestry": [
            prove_ancestry(v["earlier"], v["later"], v["committed"]) for v in vectors["ancestries"]
        ],
        "quorum_arithmetic": [tally(v) for v in vectors["tallies"]],
        "typed_status_rendering": statuses,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    sys.stdout.write(canonical_json(run_vectors(payload)))
