"""Parent-owned, local payload observers. No worker-provided delivery count."""

import socket
import threading
from pathlib import Path

from .kernel import Refusal
from .probes import DNS_PACKET, PAYLOAD


class Observer:
    def __init__(self, root, case):
        self.root = Path(root)
        self.case = case
        self.events = []
        self.errors = []
        self.stopping = threading.Event()
        self.servers = []
        self.threads = []
        self.config = {"kind": case, "mailbox": str(self.root / "mailbox")}

    def start(self):
        family = (
            socket.AF_INET6
            if self.case in ("tcp_ipv6", "udp_dns_ipv6")
            else socket.AF_UNIX
            if self.case == "unix_relay"
            else socket.AF_INET
        )
        datagram = self.case.startswith("udp_dns")
        endpoint = self._listen(family, datagram, self.case)
        self.config.update(
            family="v6"
            if family == socket.AF_INET6
            else "unix"
            if family == socket.AF_UNIX
            else "v4",
            address=endpoint,
        )
        if self.case == "proxy_relay":
            proxy = self._listen(socket.AF_INET, False, "proxy", forward=endpoint)
            self.config["address"] = proxy
        return self

    def _listen(self, family, datagram, channel, forward=None):
        server = socket.socket(
            family, socket.SOCK_DGRAM if datagram else socket.SOCK_STREAM
        )
        self.servers.append(server)
        address = (
            str(self.root / "outside.sock")
            if family == socket.AF_UNIX
            else ("::1", 0)
            if family == socket.AF_INET6
            else ("127.0.0.1", 0)
        )
        server.bind(address)
        if not datagram:
            server.listen(8)
        server.settimeout(0.05)

        def run():
            try:
                while True:
                    try:
                        if datagram:
                            payload, peer = server.recvfrom(2048)
                        else:
                            connection, _ = server.accept()
                    except TimeoutError:
                        # Only an idle listener poll proves the queue was drained.
                        # A timeout after acceptance is an observation failure.
                        if self.stopping.is_set():
                            return
                        continue
                    if datagram:
                        if payload != DNS_PACKET:
                            raise Refusal("unexpected DNS fixture packet")
                        self.events.append(channel)
                        server.sendto(b"observed", peer)
                    else:
                        with connection:
                            connection.settimeout(2)
                            payload = b""
                            while not payload.endswith(b"\n") and len(payload) <= 1024:
                                part = connection.recv(1024)
                                if not part:
                                    break
                                payload += part
                            if not payload:
                                continue  # intentionally discarded inherited connection
                            if payload != PAYLOAD:
                                raise Refusal("unexpected stream fixture payload")
                            self.events.append(channel)
                            if forward:
                                with socket.create_connection(
                                    tuple(forward), timeout=2
                                ) as onward:
                                    onward.sendall(payload)
                                    if onward.recv(32) != b"observed":
                                        raise Refusal("proxy destination not observed")
                            connection.sendall(b"observed")
            except Exception as exc:  # noqa: BLE001 - propagate all observer failures to the harness
                self.errors.append(type(exc).__name__)

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        self.threads.append(thread)
        result = server.getsockname()
        return result if family == socket.AF_UNIX else list(result[:2])

    def finish(self):
        self.stopping.set()
        for thread in self.threads:
            thread.join(timeout=3)
        if any(t.is_alive() for t in self.threads) or self.errors:
            raise Refusal("outside observer failed or did not drain")
        if self.case == "filesystem_mailbox":
            path = Path(self.config["mailbox"])
            if path.exists():
                if path.read_bytes() != PAYLOAD:
                    raise Refusal("mailbox content mismatch")
                self.events.append("filesystem_mailbox")
        return sorted(self.events)

    def close(self):
        self.stopping.set()
        for thread in self.threads:
            thread.join(timeout=3)
        for server in self.servers:
            server.close()
