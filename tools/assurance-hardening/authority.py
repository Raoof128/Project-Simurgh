"""Exact host-owned authority for two synthetic tools; no prose-derived permission."""

import copy

from capture_validation import strict_dumps

FIELDS = {
    "send_report": {"resource", "destination", "body"},
    "delete_record": {"resource"},
}


def valid(action):
    if type(action) is not dict or set(action) != {"tool", "arguments"}:
        return False
    tool, args = action["tool"], action["arguments"]
    return (
        type(tool) is str
        and tool in FIELDS
        and type(args) is dict
        and set(args) == FIELDS[tool]
        and all(type(value) is str and 0 < len(value) <= 512 for value in args.values())
    )


class Authority:
    """Created by the trusted host. Possession of model text cannot create a grant."""

    def __init__(self, grants):
        if (
            type(grants) is not list
            or len(grants) > 100
            or not all(valid(x) for x in grants)
        ):
            raise ValueError("invalid_authority")
        self._grants = frozenset(strict_dumps(x) for x in grants)

    def allows(self, action):
        return valid(action) and strict_dumps(action) in self._grants

    def execute(self, action, effect):
        # Capture the proposal before validation and use the captured value at the sink.
        # Inputs are plain JSON data; the interpreter/host callback is trusted.
        if not valid(action):
            return {"status": "blocked", "reason": "invalid_action"}
        proposal = copy.deepcopy(action)
        if not self.allows(proposal):
            return {"status": "blocked", "reason": "outside_authority"}
        effect(proposal)
        return {"status": "executed"}
