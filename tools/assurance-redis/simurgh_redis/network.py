# SPDX-License-Identifier: AGPL-3.0-or-later
"""Allow experiment Unix sockets while denying Python Internet sockets and DNS."""

import socket
from contextlib import contextmanager
from unittest.mock import patch


@contextmanager
def local_sockets_only():
    original = socket.socket.connect
    original_ex = socket.socket.connect_ex

    def blocked(*args, **kwargs):
        raise OSError("external_network_disabled")

    def connect(instance, address):
        if instance.family != socket.AF_UNIX:
            return blocked()
        return original(instance, address)

    def connect_ex(instance, address):
        if instance.family != socket.AF_UNIX:
            return blocked()
        return original_ex(instance, address)

    with (
        patch.object(socket.socket, "connect", connect),
        patch.object(socket.socket, "connect_ex", connect_ex),
        patch.object(socket, "getaddrinfo", blocked),
        patch.object(socket, "create_connection", blocked),
    ):
        yield
