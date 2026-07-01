# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the pure Capability Kernel (stdlib only; no model/gateway/agentdojo)."""
from simurgh_agentdojo_adapter.capability_kernel import (
    Action,
    AuthorityDecision,
    actions_for,
    authorise,
    is_grounded,
    split_destinations,
    POLICY_VERSION,
    CAPABILITY_ID,
)


def test_split_destinations_handles_str_list_csv_none():
    assert split_destinations("a@x.com") == ["a@x.com"]
    assert split_destinations(["a@x.com", "b@y.com"]) == ["a@x.com", "b@y.com"]
    assert split_destinations("a@x.com, b@y.com; c@z.com") == ["a@x.com", "b@y.com", "c@z.com"]
    assert split_destinations(None) == []
    assert split_destinations(["a@x.com", ["b@y.com"]]) == ["a@x.com", "b@y.com"]


def test_is_grounded_address_or_local_part():
    assert is_grounded("john.doe@bluesparrowtech.com", "email john.doe@bluesparrowtech.com")
    assert is_grounded("bob@anything.com", "send an email to bob about lunch")
    assert not is_grounded("attacker@evil.com", "summarize my calendar")
    assert not is_grounded("a@evil.com", "the answer is a good plan")  # local-part len<=2 guard


def test_is_grounded_empty_destination_fails_closed():
    # An empty/blank destination carries no recipient to authorise; a security gate must
    # default to NOT grounded (fail closed) rather than allow.
    assert not is_grounded("", "email anyone you like")
    assert not is_grounded("   ", "email anyone you like")


def test_actions_for_egress_emits_one_action_per_destination():
    acts = actions_for("send_email", {"recipients": ["x@a.com", "y@b.com"], "cc": ["z@c.com"]})
    assert [a.family for a in acts] == ["egress", "egress", "egress"]
    assert {a.target for a in acts} == {"x@a.com", "y@b.com", "z@c.com"}
    assert all(a.target_kind == "email" and a.verb == "send" for a in acts)


def test_actions_for_destructive_mutation():
    acts = actions_for("delete_file", {"file_id": "13"})
    assert len(acts) == 1
    assert acts[0].family == "destructive_mutation"
    assert acts[0].verb == "delete" and acts[0].target_kind == "file"


def test_actions_for_non_gated_tool_is_empty():
    assert actions_for("search_calendar_events", {"query": "x"}) == []
    assert actions_for("get_received_emails", {}) == []


def test_authorise_blocks_ungrounded_egress():
    d = authorise(Action("egress", "send", "email", "attacker@evil.com"), trusted_text="my calendar")
    assert d.verdict == "block" and d.reason == "ungrounded_destination"
    assert d.blocked_targets == ["attacker@evil.com"] and d.family == "egress"


def test_authorise_allows_grounded_egress():
    d = authorise(Action("egress", "send", "email", "bob@x.com"), trusted_text="email bob@x.com")
    assert d.verdict == "allow" and d.reason == "task_grounded"


def test_authorise_blocks_destructive_mutation_without_intent():
    d = authorise(Action("destructive_mutation", "delete", "file", "13"), trusted_text="summarize my files")
    assert d.verdict == "block" and d.reason == "destructive_mutation_not_authorised"


def test_authorise_allows_destructive_mutation_with_intent():
    d = authorise(Action("destructive_mutation", "delete", "file", "13"), trusted_text="please delete the old file")
    assert d.verdict == "allow" and d.reason == "task_grounded"


def test_constants_are_stable_strings():
    assert POLICY_VERSION == "stage4a-lite.authority-policy.v1"
    assert CAPABILITY_ID == "task_grounded_authority.v1"
    assert isinstance(AuthorityDecision("allow", "task_grounded", "egress", [], False).would_execute, bool)
