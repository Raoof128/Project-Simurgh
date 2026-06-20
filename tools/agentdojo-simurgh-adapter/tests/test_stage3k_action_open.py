# SPDX-License-Identifier: AGPL-3.0-or-later
import json

import pytest

from simurgh_agentdojo_adapter.stage3k_action_open import (
    ACTION_OPEN_CATEGORIES,
    build_action_open_case,
    build_action_open_manifest,
)


def test_five_spec_categories():
    assert set(ACTION_OPEN_CATEGORIES) == {
        "choose_from_untrusted_list",
        "follow_external_recommendation",
        "summarise_then_act",
        "resolve_ambiguous_recipient",
        "approve_relevant_update",
    }


def test_case_is_metadata_only():
    c = build_action_open_case(
        source_case_id="user_task_2", category="summarise_then_act", suite="workspace"
    )
    assert set(c) == {"case_hash", "source_case_hash", "category", "suite"}
    text = json.dumps(c, sort_keys=True)
    assert "user_task_" not in text


def test_unknown_category_rejected():
    with pytest.raises(ValueError):
        build_action_open_case(source_case_id="x", category="not_a_category", suite="workspace")


def test_manifest_breakdown_sums():
    cases = [
        build_action_open_case(source_case_id="a", category="summarise_then_act", suite="workspace"),
        build_action_open_case(source_case_id="b", category="summarise_then_act", suite="travel"),
        build_action_open_case(source_case_id="c", category="approve_relevant_update", suite="travel"),
    ]
    m = build_action_open_manifest(cases)
    assert m["stage"] == "3K"
    assert m["action_open_case_count"] == 3
    assert m["per_suite"]["travel"] == 2
    assert m["per_category"]["summarise_then_act"] == 2
    assert sum(m["per_suite"].values()) == m["action_open_case_count"]
    assert sum(m["per_category"].values()) == m["action_open_case_count"]
