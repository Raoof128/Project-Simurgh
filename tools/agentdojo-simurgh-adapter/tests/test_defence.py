# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.defence import SimurghDefence


class _StubClient:
    """Stand-in for SimurghClient; returns a queued gateway response."""

    def __init__(self, resp):
        self._resp = resp
        self.seen = None

    def run(self, **kwargs):
        self.seen = kwargs
        return self._resp


def test_defence_blocks_and_returns_sentinel():
    client = _StubClient(
        {
            "gateway_verdict": "blocked",
            "tool_gate_verdict": "blocked",
            "reason_codes": ["unsafe_tool"],
            "receipt": {"run_id": "gw_run_007"},
        }
    )
    d = SimurghDefence(client)
    out = d.mediate(
        {
            "case_id": "c1",
            "track": "tool_injection",
            "input": "x",
            "contexts": [{"content": "u"}],
        }
    )
    assert out["allow"] is False
    assert out["blocked_action"]["boundary"] == "tool_gate"
    assert client.seen["scenario"] == "tool_escalation"


def test_defence_allows_benign():
    client = _StubClient(
        {
            "gateway_verdict": "accepted",
            "reason_codes": [],
            "receipt": {"run_id": "gw_run_001"},
        }
    )
    d = SimurghDefence(client)
    out = d.mediate({"case_id": "c2", "track": "benign", "input": "hi", "contexts": None})
    assert out["allow"] is True and out["blocked_action"] is None


def test_query_is_alias_of_mediate():
    client = _StubClient(
        {
            "gateway_verdict": "accepted",
            "reason_codes": [],
            "receipt": {"run_id": "gw_run_001"},
        }
    )
    d = SimurghDefence(client)
    assert (
        d.query({"case_id": "c", "track": "benign", "input": "y", "contexts": None})["allow"]
        is True
    )
