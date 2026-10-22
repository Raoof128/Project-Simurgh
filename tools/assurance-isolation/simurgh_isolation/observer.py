"""Parent-owned collectors: incomplete streams and active I/O errors refuse."""

import socket
import threading

from .kernel import Refusal


class Collector:
    def __init__(self, family=socket.AF_INET, kind=socket.SOCK_STREAM, address=None):
        self.socket = socket.socket(family, kind)
        self.socket.bind(
            address
            if address is not None
            else (("::1", 0) if family == socket.AF_INET6 else ("127.0.0.1", 0))
        )
        self.address = self.socket.getsockname()
        self.kind = kind
        if kind == socket.SOCK_STREAM:
            self.socket.listen(8)
        self.socket.settimeout(0.05)
        self.frames = []
        self.errors = []
        self.stop = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        try:
            while True:
                try:
                    event = (
                        self.socket.recvfrom(2048)
                        if self.kind == socket.SOCK_DGRAM
                        else self.socket.accept()
                    )
                except TimeoutError:
                    if self.stop.is_set():
                        return
                    continue
                if self.kind == socket.SOCK_DGRAM:
                    data, address = event
                    if not data.endswith(b"\n") or len(data) > 1024:
                        raise Refusal("malformed datagram")
                    self.frames.append(data.decode("ascii"))
                    self.socket.sendto(b"ACK\n", address)
                else:
                    connection, _ = event
                    with connection:
                        connection.settimeout(2)
                        data = b""
                        acknowledged = False
                        while chunk := connection.recv(2048):
                            if acknowledged:
                                raise Refusal("extra bytes after frame")
                            data += chunk
                            if len(data) > 1024:
                                raise Refusal("oversize frame")
                            if data.endswith(b"\n"):
                                if data.count(b"\n") != 1:
                                    raise Refusal("multiple frames")
                                self.frames.append(data.decode("ascii"))
                                connection.sendall(b"ACK\n")
                                acknowledged = True
                        if data and not acknowledged:
                            raise Refusal("incomplete stream")
        except Exception as exc:  # noqa: BLE001 -- any observer failure invalidates evidence
            self.errors.append(type(exc).__name__ + ": " + str(exc))

    def finish(self):
        self.stop.set()
        self.thread.join(3)
        if self.thread.is_alive() or self.errors:
            raise Refusal("collector unavailable: " + repr(self.errors))
        return list(self.frames)

    def close(self):
        self.stop.set()
        self.thread.join(3)
        self.socket.close()
