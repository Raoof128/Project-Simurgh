# SPDX-License-Identifier: AGPL-3.0-or-later
"""Bounded single-command RESP2 transport and an instrumented reply-loss proxy."""

import socket
import tempfile
import threading
import time
from pathlib import Path

MAX_BYTES = 65536


def encode(command):
    if not command or len(command) > 16:
        raise ValueError("invalid_command")
    parts = [
        part.encode("utf-8") if isinstance(part, str) else part for part in command
    ]
    if any(type(part) is not bytes for part in parts):
        raise ValueError("invalid_command")
    data = b"*" + str(len(parts)).encode() + b"\r\n"
    data += b"".join(
        b"$" + str(len(part)).encode() + b"\r\n" + part + b"\r\n" for part in parts
    )
    if len(data) > MAX_BYTES:
        raise ValueError("command_too_large")
    return data


class Reader:
    def __init__(self, connection, deadline):
        self.connection = connection
        self.deadline = deadline
        self.count = 0

    def take(self, length):
        if length < 0 or self.count + length > MAX_BYTES:
            raise ValueError("reply_too_large")
        output = b""
        while len(output) < length:
            remaining = self.deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("response_timeout")
            self.connection.settimeout(remaining)
            data = self.connection.recv(length - len(output))
            if not data:
                raise OSError("response_lost")
            output += data
        self.count += length
        return output

    def line(self):
        value = b""
        while not value.endswith(b"\r\n"):
            if len(value) >= 128:
                raise ValueError("invalid_resp_line")
            value += self.take(1)
        return value[:-2]

    def scalar(self):
        line = self.line()
        if line.startswith(b"+"):
            return line[1:]
        if line.startswith(b"-"):
            raise ValueError("redis_error")
        if line.startswith(b":"):
            return int(line[1:])
        if line.startswith(b"$"):
            size = int(line[1:])
            if size == -1:
                return None
            value = self.take(size + 2)
            if not value.endswith(b"\r\n"):
                raise ValueError("invalid_resp_bulk")
            return value[:-2]
        raise ValueError("invalid_resp")


def response_bytes(value):
    if value is None:
        return b"$-1\r\n"
    if type(value) is int:
        return b":" + str(value).encode() + b"\r\n"
    return b"$" + str(len(value)).encode() + b"\r\n" + value + b"\r\n"


def request(path, command, *, timeout=2):
    data = encode(command)
    deadline = time.monotonic() + timeout
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
        connection.settimeout(timeout)
        connection.connect(str(path))
        connection.sendall(data)
        return Reader(connection, deadline).scalar()


class DropReply:
    """One request; acceptance is evidenced by reading the actual upstream reply."""

    def __init__(self, upstream, *, before_send=False, forward=False):
        self.upstream = upstream
        self.before_send = before_send
        self.forward = forward
        self.reply = None
        self.command = None
        self.error = None
        self.temp = tempfile.TemporaryDirectory(prefix="sr-proxy-")
        self.socket = Path(self.temp.name) / "proxy.sock"
        self.listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.listener.bind(str(self.socket))
        self.listener.listen(1)
        self.listener.settimeout(5)
        self.thread = threading.Thread(target=self._serve, daemon=True)

    def _serve(self):
        try:
            connection, _ = self.listener.accept()
            with connection:
                reader = Reader(connection, time.monotonic() + 5)
                header = reader.line()
                if not header.startswith(b"*") or not 1 <= int(header[1:]) <= 16:
                    raise ValueError("invalid_proxy_request")
                self.command = [reader.scalar() for _ in range(int(header[1:]))]
                if not all(type(value) is bytes for value in self.command):
                    raise ValueError("invalid_proxy_request")
                if not self.before_send:
                    self.reply = request(self.upstream, self.command)
                    if self.forward:
                        connection.sendall(response_bytes(self.reply))
        except (OSError, ValueError, TypeError) as error:
            self.error = error

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.thread.join(timeout=6)
        self.listener.close()
        self.temp.cleanup()
        if self.thread.is_alive():
            raise RuntimeError("proxy_not_stopped")
        if self.error is not None:
            raise RuntimeError("proxy_failed") from self.error
