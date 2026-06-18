# SPDX-License-Identifier: AGPL-3.0-or-later
import json
import pytest
from simurgh_agentdojo_adapter.simurgh_client import SimurghClient, GatewayUnavailable


class _FakeTransport:
    """Records calls and returns queued JSON responses."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, method, url, headers, body):
        self.calls.append({"method": method, "url": url, "headers": headers, "body": body})
        if not self.responses:
            raise AssertionError("unexpected extra call")
        status, payload = self.responses.pop(0)
        if status >= 400 and url.endswith("/health"):
            raise OSError("health down")
        return status, json.dumps(payload).encode()


def test_preflight_passes_when_health_ok():
    t = _FakeTransport([(200, {"ok": True})])
    c = SimurghClient(base_url="http://x/api/llm-shield/gateway", transport=t)
    c.preflight()  # must not raise
    assert t.calls[0]["url"].endswith("/health")


def test_preflight_raises_when_gateway_down():
    t = _FakeTransport([(503, {}), (503, {})])  # health fails, session-create fails
    c = SimurghClient(base_url="http://x/api/llm-shield/gateway", transport=t)
    with pytest.raises(GatewayUnavailable):
        c.preflight()


def test_run_sends_bearer_and_returns_verdict():
    t = _FakeTransport(
        [
            (200, {"ok": True, "session_id": "gw_sess_1", "token": "tok"}),
            (
                200,
                {
                    "ok": False,
                    "gateway_verdict": "blocked",
                    "tool_gate_verdict": "blocked",
                    "reason_codes": ["unsafe_tool"],
                    "receipt": {"run_id": "gw_run_001"},
                },
            ),
        ]
    )
    c = SimurghClient(base_url="http://x/api/llm-shield/gateway", transport=t)
    c.create_session()
    r = c.run(
        input="do the task",
        contexts=[{"content": "untrusted"}],
        provider_mode="mock",
        scenario="tool_escalation",
    )
    assert r["gateway_verdict"] == "blocked"
    assert t.calls[1]["headers"]["Authorization"] == "Bearer tok"
    assert t.calls[1]["url"].endswith("/gw_sess_1/run")


def test_run_without_session_raises():
    t = _FakeTransport([])
    c = SimurghClient(base_url="http://x/api/llm-shield/gateway", transport=t)
    with pytest.raises(GatewayUnavailable):
        c.run(input="x", contexts=None, scenario="benign")
