# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fail closed on Python socket connections/DNS during the local experiment."""

from contextlib import ExitStack, contextmanager
from unittest.mock import patch


def _denied(*args, **kwargs):
    raise OSError("network_disabled: this experiment uses scripted local responses")


@contextmanager
def deny_network():
    with ExitStack() as stack:
        for target in (
            "socket.socket.connect",
            "socket.socket.connect_ex",
            "socket.create_connection",
            "socket.getaddrinfo",
        ):
            stack.enter_context(patch(target, _denied))
        yield
