#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 5P VSI cross-runtime parity, stdlib only. Motto: AnthropicSafe First, then ReviewerSafe.
#
# Reproduces, INDEPENDENTLY, every value that reaches a 5P verdict:
#   * the componentwise order (leqV), the join, and the four comparator relations
#   * deriveSubjectId  — SHA256(domain || 0x00 || namespace || 0x00 || subject_bytes)
#   * evidenceReplayIdentity — SHA256 over canonical JSON, profile and delta EXCLUDED
#
# The point of a parity lane is that a SECOND implementation, written from the spec rather than
# translated from the code, lands on the same bytes. So nothing here imports the Node modules or
# mirrors their control flow — the expectations come from parity-vectors.json, which Node generated,
# and everything compared against them is recomputed here from primitives.
#
# EXCLUDED from parity by contract: signature verification and profile trust decisions (B11 — those
# are adapter work, and Node is authoritative), plus filesystem-bound lane loaders.
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VECTORS = os.path.join(HERE, "parity-vectors.json")

SUBJECT_DOMAIN = "simurgh.vsi.subject.v1"
REPLAY_DOMAIN = "simurgh.vsi.replay.v1"
NUL = b"\x00"


def canonical_json(value):
    """RFC 8785-shaped canonical JSON: sorted keys, no whitespace, UTF-8.

    Must byte-match tools/simurgh-attestation/canonicalise.mjs for the subset 5P uses (objects,
    strings, arrays). Python's json with sort_keys and tight separators produces exactly that.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def derive_subject_id(namespace_id, subject_bytes):
    """Domain-separated, NUL-delimited. Bare 64-hex — NOT a prefixed `sha256:` token."""
    h = hashlib.sha256()
    h.update(SUBJECT_DOMAIN.encode("utf-8"))
    h.update(NUL)
    h.update(namespace_id.encode("utf-8"))
    h.update(NUL)
    h.update(subject_bytes)
    return h.hexdigest()


def replay_identity(evidence):
    """profile_id and asserted_strength_delta are EXCLUDED on purpose — that exclusion IS the
    mechanism behind S2.C4. Including the profile would let an upgrade attempt rename itself."""
    h = hashlib.sha256()
    h.update(REPLAY_DOMAIN.encode("utf-8"))
    h.update(NUL)
    h.update(evidence["evidence_digest"].encode("utf-8"))
    h.update(NUL)
    h.update(evidence["submission_digest_binding"].encode("utf-8"))
    h.update(NUL)
    h.update(canonical_json(evidence["claim"]).encode("utf-8"))
    return h.hexdigest()


def position_of(axis_values, axis, value):
    return axis_values[axis].index(value)


def leq_v(axes, axis_values, a, b):
    return all(position_of(axis_values, ax, a[ax]) <= position_of(axis_values, ax, b[ax]) for ax in axes)


def join_v(axes, axis_values, a, b):
    out = {}
    for ax in axes:
        out[ax] = a[ax] if position_of(axis_values, ax, a[ax]) >= position_of(axis_values, ax, b[ax]) else b[ax]
    return out


def compare_strength(axes, axis_values, a, b):
    below = leq_v(axes, axis_values, a, b)
    above = leq_v(axes, axis_values, b, a)
    if below and above:
        return "equal"
    if below:
        return "strictly_below"
    if above:
        return "strictly_above"
    return "incomparable"


def main():
    with open(VECTORS, "r", encoding="utf-8") as fh:
        v = json.load(fh)

    axes = v["axes"]
    axis_values = v["axis_values"]
    vectors = v["vectors"]
    failures = []

    # --- the lattice, over the WHOLE product space -----------------------------------------------
    for row in v["pairs"]:
        a, b = vectors[row["a"]], vectors[row["b"]]
        got_leq = leq_v(axes, axis_values, a, b)
        if got_leq != row["leq"]:
            failures.append("leq %s vs %s: py=%s node=%s" % (a, b, got_leq, row["leq"]))
        got_join = join_v(axes, axis_values, a, b)
        if got_join != row["join"]:
            failures.append("join %s vs %s: py=%s node=%s" % (a, b, got_join, row["join"]))
        got_rel = compare_strength(axes, axis_values, a, b)
        if got_rel != row["rel"]:
            failures.append("relation %s vs %s: py=%s node=%s" % (a, b, got_rel, row["rel"]))

    # --- subject derivation, including a NON-ASCII case ------------------------------------------
    for s in v["subjects"]:
        got = derive_subject_id(s["ns"], s["text"].encode("utf-8"))
        if got != s["subject_id"]:
            failures.append("subject %s/%s: py=%s node=%s" % (s["ns"], s["text"], got, s["subject_id"]))
        if got.startswith("sha256:"):
            failures.append("subject id must be BARE hex, never a prefixed token")

    # --- replay identity --------------------------------------------------------------------------
    ancestor_evidence = {
        "claim": {
            "principal": {
                "type": "simurgh.vsi.principal.v1",
                "kind": "account",
                "namespace_id": "simurgh.synthetic.subject.v1",
                "subject_id": "a" * 64,
            }
        },
        "evidence_digest": "c" * 64,
        "submission_digest_binding": "d" * 64,
    }
    expected = v["replays"][0]["replay_identity"]
    got = replay_identity(ancestor_evidence)
    if got != expected:
        failures.append("replay identity: py=%s node=%s" % (got, expected))

    # --- the exclusion is load-bearing: changing the profile must NOT change the identity ---------
    with_profile = dict(ancestor_evidence)
    with_profile["profile_id"] = "simurgh.synthetic.role-authority.v1"
    if replay_identity(with_profile) != got:
        failures.append("replay identity changed when a profile was added — S2.C4 would be blind")

    total = len(v["pairs"]) * 3 + len(v["subjects"]) + 2
    if failures:
        print("PARITY FAILED (%d of %d checks)" % (len(failures), total))
        for f in failures[:20]:
            print("  " + f)
        return 1
    print("stage5p parity: Node == stdlib Python on %d checks "
          "(%d lattice pairs x3, %d subject derivations, replay identity + its exclusion)"
          % (total, len(v["pairs"]), len(v["subjects"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
