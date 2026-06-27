# SPDX-License-Identifier: AGPL-3.0-or-later
from stage4d.dispatch_controller import record_dispatch


def test_blocked_action_is_never_dispatched():
    result = record_dispatch("act_001", "block", signed_receipt_exists=False)
    assert result == {
        "action_id": "act_001",
        "decision": "block",
        "simulated_dispatched": False,
        "fail_closed": False,
        "dispatch_reason": "blocked_by_policy",
    }


def test_allowed_action_requires_signed_receipt():
    result = record_dispatch("act_000", "allow", signed_receipt_exists=False)
    assert result["simulated_dispatched"] is False
    assert result["fail_closed"] is True
    assert result["dispatch_reason"] == "signed_receipt_required_before_dispatch"


def test_allowed_action_dispatches_after_signed_receipt():
    result = record_dispatch("act_000", "allow", signed_receipt_exists=True)
    assert result["simulated_dispatched"] is True
    assert result["fail_closed"] is False
    assert result["dispatch_reason"] == "signed_receipt_present"
