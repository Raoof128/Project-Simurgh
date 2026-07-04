# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4O Python manifest-surface tests (mirror of the Node core tests)."""
from _stage4o_helpers import mk_entry, mk_manifest, mk_envelope
from simurgh_agentdojo_adapter import manifest_surface as ms


def test_canonical_json_matches_node_conventions():
    assert ms.canonical_json({"b": 2, "a": [1, {"y": 0, "x": 1}]}) == '{"a":[1,{"x":1,"y":0}],"b":2}'


def test_domain_digest_shape_and_separation():
    a = ms.domain_digest(ms.DOMAINS["TOOL_ENTRY"], "s", {"x": 1})
    b = ms.domain_digest(ms.DOMAINS["ACTION"], "s", {"x": 1})
    assert a.startswith("sha256:") and len(a) == 71 and a != b


def test_unknown_domain_raises():
    try:
        ms.domain_digest("NOPE", "s", {})
        raise AssertionError("expected ValueError")
    except ValueError:
        pass


def test_validate_manifest_arms():
    m = mk_manifest([mk_entry(1), mk_entry(2)])
    assert ms.validate_manifest(m) == {"ok": True}
    assert ms.validate_manifest({**m, "extra": 1})["ok"] is False
    bad = mk_manifest([mk_entry(1, authority_class="root"), mk_entry(2)])
    assert ms.validate_manifest(bad)["ok"] is False
    unsorted = {**m, "tools": list(reversed(m["tools"]))}
    assert ms.validate_manifest(unsorted)["ok"] is False


def test_compute_toolset_root_matches_field():
    m = mk_manifest([mk_entry(1), mk_entry(2), mk_entry(3)])
    assert ms.compute_toolset_root(m) == m["toolset_digest"]


def test_delta_object_and_digest():
    m0 = mk_manifest([mk_entry(1), mk_entry(2)])
    m1 = mk_manifest([mk_entry(1), mk_entry(2, authority_class="write"), mk_entry(3)])
    d = ms.delta_object(m0, m1)
    assert len(d["added"]) == 1 and len(d["changed"]) == 1 and len(d["removed"]) == 0
    assert ms.delta_digest(m0, m1) == ms.delta_digest(m0, m1)


def test_classify_drift_six_cases():
    base = mk_manifest([mk_entry(1), mk_entry(2)])
    assert ms.classify_drift(base, mk_manifest([mk_entry(1), mk_entry(2)])) == "equal"
    assert ms.classify_drift(base, mk_manifest([mk_entry(1)])) == "narrowing"
    assert ms.classify_drift(base, mk_manifest([mk_entry(1), mk_entry(2), mk_entry(3)])) == "broadening"
    assert ms.classify_drift(base, mk_manifest([mk_entry(1), mk_entry(2, authority_class="write")])) == "broadening"
    schema9 = mk_entry(9)["tool_schema_digest"]
    assert ms.classify_drift(base, mk_manifest([mk_entry(1, tool_schema_digest=schema9), mk_entry(2)])) == "incomparable"
    assert ms.classify_drift(base, mk_manifest([mk_entry(1), mk_entry(3)])) == "incomparable"


def test_validate_chain_arms():
    m0 = mk_manifest([mk_entry(1)])
    m1 = mk_manifest([mk_entry(1), mk_entry(2)])
    e0 = mk_envelope(m0, 0, None, "state")
    assert ms.validate_chain([e0])["ok"] is True
    blind = mk_envelope(m1, 1, e0, "state")
    assert ms.validate_chain([e0, blind]) == {"ok": False, "raw": 65, "reason": "state_bound_broadening"}
    informed = mk_envelope(m1, 1, e0, "delta")
    assert ms.validate_chain([e0, informed])["ok"] is True
    bad_link = {**informed, "previous_manifest_digest": "sha256:" + "b" * 64}
    assert ms.validate_chain([e0, bad_link]) == {"ok": False, "raw": 64, "reason": "prev_digest_mismatch"}
    assert ms.validate_chain([informed]) == {"ok": False, "raw": 64, "reason": "ancestry_incomplete"}
