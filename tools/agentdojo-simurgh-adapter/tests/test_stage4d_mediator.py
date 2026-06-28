# SPDX-License-Identifier: AGPL-3.0-or-later
from pathlib import Path

from stage4d.mediator import build_run_record, load_fixture


FIXTURE = Path("stage4d/fixtures/browser_inject_01.json")


def test_fixture_loads_four_metadata_only_actions():
    fixture = load_fixture(FIXTURE)
    assert fixture["run_id"] == "stage4d-browser-inject-01"
    assert [a["action_id"] for a in fixture["actions"]] == [
        "act_000",
        "act_001",
        "act_002",
        "act_003",
    ]
    assert all("raw" not in str(action).lower() for action in fixture["actions"])


def test_run_record_has_contiguous_steps_and_expected_decisions():
    record = build_run_record(FIXTURE)
    assert [event["step_index"] for event in record["action_observation_log"]] == [0, 1, 2, 3]
    assert [event["action_id"] for event in record["action_observation_log"]] == [
        "act_000",
        "act_001",
        "act_002",
        "act_003",
    ]
    assert [d["decision"] for d in record["decisions"]] == ["allow", "block", "block", "allow"]
    assert [d["decision_reason_code"] for d in record["decisions"]] == [
        "POLICY_ALLOWED",
        "AUTHORITY_ESCALATION_BLOCKED",
        "UNTRUSTED_SECRET_EXPORT_BLOCKED",
        "POLICY_ALLOWED",
    ]


def test_run_record_contains_replay_material_for_every_action():
    record = build_run_record(FIXTURE)
    assert sorted(record["replay_material"]) == ["act_000", "act_001", "act_002", "act_003"]
    for material in record["replay_material"].values():
        assert "resolved_args_redacted" in material
        assert "policy_features_source" in material
        assert "taint_derivation_inputs" in material
        assert "decision_context" in material
        assert "body_text" not in str(material).lower()
        assert "secret-value" not in str(material).lower()
