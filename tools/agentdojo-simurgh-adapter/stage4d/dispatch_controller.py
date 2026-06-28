# SPDX-License-Identifier: AGPL-3.0-or-later
"""Recorded-fixture dispatch accounting for Stage 4D."""


def record_dispatch(action_id: str, decision: str, *, signed_receipt_exists: bool) -> dict:
    if decision == "block":
        return {
            "action_id": action_id,
            "decision": decision,
            "simulated_dispatched": False,
            "fail_closed": False,
            "dispatch_reason": "blocked_by_policy",
        }
    if decision == "allow" and signed_receipt_exists:
        return {
            "action_id": action_id,
            "decision": decision,
            "simulated_dispatched": True,
            "fail_closed": False,
            "dispatch_reason": "signed_receipt_present",
        }
    return {
        "action_id": action_id,
        "decision": decision,
        "simulated_dispatched": False,
        "fail_closed": True,
        "dispatch_reason": "signed_receipt_required_before_dispatch",
    }
