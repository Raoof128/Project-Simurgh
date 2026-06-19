# SPDX-License-Identifier: AGPL-3.0-or-later
"""AgentDojo defence registration helper for Stage 3H-L2.

This module intentionally does not import AgentDojo at module import time so
regular CI can run without the optional dependency.
"""

from __future__ import annotations

from .defence import SimurghDefence


class AgentDojoUnavailable(RuntimeError):
    pass


def _agentdojo_available() -> bool:
    try:
        __import__("agentdojo")
        return True
    except ImportError:
        return False


def require_agentdojo() -> None:
    if not _agentdojo_available():
        raise AgentDojoUnavailable(
            "AgentDojo is not installed. Install the pinned optional dependency with "
            "`pip install -e .[agentdojo]` from tools/agentdojo-simurgh-adapter."
        )


def build_defence(client) -> SimurghDefence:
    return SimurghDefence(client)
