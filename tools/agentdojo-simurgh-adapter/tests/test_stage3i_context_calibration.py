# SPDX-License-Identifier: AGPL-3.0-or-later
from simurgh_agentdojo_adapter.layer2_runner import _GatewayRecorder, _blocking_boundary

ALLOWED_FIELDS = {"context_id", "source_type", "trust_level", "purpose", "content"}


class _FakeClient:
    def __init__(self, response):
        self._response = response
        self.calls = []

    def run(self, **kwargs):
        self.calls.append(kwargs)
        return self._response


class _Task:
    def __init__(self, task_id):
        self.ID = task_id


def _context_for(task_id, response):
    client = _FakeClient(response)
    _GatewayRecorder(client).record(_Task(task_id))
    return client.calls[0]["contexts"][0]


def test_benign_task_uses_synthetic_seed_provenance():
    ctx = _context_for("user_task_0", {"gateway_verdict": "accepted", "receipt": {"run_id": "gw_run_001"}})
    assert ctx["trust_level"] == "synthetic"
    assert ctx["source_type"] == "system_seed"
    assert ctx["purpose"] == "task_data"
    assert ctx["trust_level"] != "metadata_only"
    assert set(ctx) <= ALLOWED_FIELDS
    # content is hash-only: no raw task identifier or text leaks into provenance
    assert ctx["content"].startswith("task_id_hash:")
    assert "user_task_0" not in ctx["content"]


def test_injection_task_uses_untrusted_provenance():
    ctx = _context_for("injection_task_0", {"gateway_verdict": "blocked", "receipt": {"run_id": "gw_run_013"}})
    assert ctx["trust_level"] == "untrusted"
    assert ctx["source_type"] == "tool_result"
    assert ctx["purpose"] == "reference"
    assert set(ctx) <= ALLOWED_FIELDS


def test_blocking_boundary_labels_input_firewall_distinctly():
    assert _blocking_boundary({"input_verdict": "blocked", "gateway_verdict": "blocked"}) == "input_firewall"


def test_blocking_boundary_context_guard_when_input_safe():
    assert _blocking_boundary({"input_verdict": "safe", "gateway_verdict": "blocked"}) == "context_guard"


def test_blocking_boundary_tool_gate_precedence():
    assert (
        _blocking_boundary(
            {"input_verdict": "safe", "tool_gate_verdict": "blocked", "gateway_verdict": "blocked"}
        )
        == "tool_gate"
    )


def test_blocking_boundary_none_when_accepted():
    assert _blocking_boundary({"input_verdict": "safe", "gateway_verdict": "accepted"}) is None
