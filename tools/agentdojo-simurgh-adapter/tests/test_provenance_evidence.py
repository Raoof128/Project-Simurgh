# SPDX-License-Identifier: AGPL-3.0-or-later
"""Stage 4C evidence: provenance-gating closes the poisoned-participant laundering gap."""
import json

from simurgh_agentdojo_adapter.provenance_evidence import (
    build_provenance_corpus,
    emit_provenance_decisions,
    summarise_provenance,
)


def test_provenance_closes_the_naive_laundering_gap():
    s = summarise_provenance(emit_provenance_decisions(build_provenance_corpus(), run_id="x"))
    # a provenance-blind impl would have laundered at least one poisoned attack
    assert s["naive_laundering_exposed"] >= 1
    # 4C contains every one of those
    assert s["poisoning_contained"] == s["naive_laundering_exposed"]
    assert s["provenance_closes_naive_gap"] is True
    # and 4C launders nothing, full containment, benign recovery preserved
    assert s["laundering_failures_4c"] == 0
    assert s["no_laundering_4c"] is True
    assert s["full_containment_4c"] is True
    assert s["benign_recovered"] >= 1


def test_record_shape_and_privacy_no_raw_addresses():
    for d in emit_provenance_decisions(build_provenance_corpus(), run_id="x"):
        assert d["schema"] == "simurgh.provenance_authority_decision.v1"
        assert d["action"]["target_hash"].startswith("sha256:")
        assert d["decision_4c"]["verdict"] in ("allow", "block")
        blob = json.dumps(d)
        assert "mark.black-2134@gmail.com" not in blob
        assert "bluesparrowtech.com" not in blob
        assert "eve-9981@gmail.com" not in blob


def test_poisoned_participant_blocked_but_naive_would_allow():
    decs = emit_provenance_decisions(build_provenance_corpus(), run_id="x")
    poisoned = [d for d in decs if d["case_id"] == "injection::poisoned_participant"][0]
    assert poisoned["verdict_naive_blind"] == "allow"  # the gap a blind impl opens
    assert poisoned["decision_4c"]["verdict"] == "block"  # 4C closes it
