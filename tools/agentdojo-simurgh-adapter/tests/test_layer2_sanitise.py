# SPDX-License-Identifier: AGPL-3.0-or-later
import pytest

from simurgh_agentdojo_adapter.layer2_sanitise import SanitiseError, sanitise_agentdojo_row


def test_sanitise_keeps_allowlisted_fields_only():
    row = sanitise_agentdojo_row(
        {
            "agentdojo_run_id": "run-1",
            "task_id": "task-1",
            "security_case_id": "sec-1",
            "kind": "security",
            "attack_family": "important_instructions",
            "defence": "simurgh",
            "utility_success": True,
            "attack_success": False,
            "completed": True,
            "debug_note": "do not keep this",
        }
    )
    assert row["agentdojo_run_id"] == "run-1"
    assert "debug_note" not in row


def test_sanitise_rejects_forbidden_nested_keys():
    with pytest.raises(SanitiseError, match="raw_provider_output"):
        sanitise_agentdojo_row(
            {
                "agentdojo_run_id": "run-1",
                "kind": "security",
                "raw_provider_output": {"text": "secret"},
            }
        )
