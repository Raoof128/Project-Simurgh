# SPDX-License-Identifier: AGPL-3.0-or-later
import pytest

from simurgh_agentdojo_adapter.agentdojo_register import AgentDojoUnavailable, build_defence


class _Client:
    pass


def test_build_defence_returns_transport_only_simurgh_defence():
    defence = build_defence(_Client())
    assert defence.__class__.__name__ == "SimurghDefence"
    assert hasattr(defence, "query")


def test_missing_agentdojo_import_can_be_reported_as_blocked(monkeypatch):
    import simurgh_agentdojo_adapter.agentdojo_register as mod

    monkeypatch.setattr(mod, "_agentdojo_available", lambda: False)
    with pytest.raises(AgentDojoUnavailable, match="AgentDojo is not installed"):
        mod.require_agentdojo()
