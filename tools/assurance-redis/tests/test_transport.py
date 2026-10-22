# SPDX-License-Identifier: AGPL-3.0-or-later
import socket
import tempfile
import threading
import unittest
from pathlib import Path

from simurgh_redis.network import local_sockets_only
from simurgh_redis.transport import encode, request


class TransportTests(unittest.TestCase):
    def test_request_and_reply_bounds(self):
        with self.assertRaisesRegex(ValueError, "command_too_large"):
            encode(["SET", "key", b"x" * 65536])
        for response in (b"$65537\r\n", b"$-2\r\n", b"-ERR deliberate\r\n", b"*0\r\n"):
            with (
                self.subTest(response=response),
                tempfile.TemporaryDirectory(prefix="sr-wire-") as directory,
            ):
                path = Path(directory) / "fake.sock"
                with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as listener:
                    listener.bind(str(path))
                    listener.listen(1)

                    def serve(reply=response, server=listener):
                        connection, _ = server.accept()
                        with connection:
                            connection.recv(1024)
                            connection.sendall(reply)

                    thread = threading.Thread(target=serve)
                    thread.start()
                    try:
                        with self.assertRaises(ValueError):
                            request(path, ["PING"])
                    finally:
                        thread.join(2)
                        self.assertFalse(thread.is_alive())

    def test_external_socket_and_dns_guard(self):
        with local_sockets_only():
            with (
                socket.socket() as connection,
                self.assertRaisesRegex(OSError, "external_network_disabled"),
            ):
                connection.connect(("127.0.0.1", 80))
            with self.assertRaisesRegex(OSError, "external_network_disabled"):
                socket.getaddrinfo("example.com", 443)


if __name__ == "__main__":
    unittest.main()
