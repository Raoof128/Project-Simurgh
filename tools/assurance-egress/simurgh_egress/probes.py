"""Synthetic probes address only host-provisioned disposable endpoints."""

import errno
import json
import os
import socket
import sys
from pathlib import Path

PAYLOAD = b"simurgh-egress-fixture\n"
DNS_PACKET = b"\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x06egress\x04test\x00\x00\x01\x00\x01"


def attempt(config):
    try:
        if config["kind"] == "filesystem_mailbox":
            Path(config["mailbox"]).write_bytes(PAYLOAD)
            return {"outcome": "delivered", "errno": None}
        family = {"v4": socket.AF_INET, "v6": socket.AF_INET6, "unix": socket.AF_UNIX}[
            config["family"]
        ]
        datagram = config["kind"].startswith("udp_dns")
        with socket.socket(
            family, socket.SOCK_DGRAM if datagram else socket.SOCK_STREAM
        ) as sock:
            sock.settimeout(2)
            address = (
                config["address"]
                if family == socket.AF_UNIX
                else tuple(config["address"])
            )
            if datagram:
                sock.sendto(DNS_PACKET, address)
                response, _ = sock.recvfrom(32)
            else:
                sock.connect(address)
                sock.sendall(PAYLOAD)
                response = sock.recv(32)
            if response != b"observed":
                return {"outcome": "failed", "errno": "BAD_ACK"}
        return {"outcome": "delivered", "errno": None}
    except OSError as exc:
        return {
            "outcome": "blocked" if exc.errno == errno.EPERM else "failed",
            "errno": errno.errorcode.get(exc.errno, "UNKNOWN"),
        }


def fork_probe(config, *, execute):
    # The child communicates only an exit status; the outside observer decides delivery.
    child = os.fork()
    if child == 0:
        if execute:
            os.execv(
                sys.executable,
                [sys.executable, "-m", "simurgh_egress.probes", json.dumps(config)],
            )
        outcome = attempt(config)
        os._exit({"delivered": 0, "blocked": 10}.get(outcome["outcome"], 20))
    _, status = os.waitpid(child, 0)
    code = os.waitstatus_to_exitcode(status)
    return {
        "outcome": {0: "delivered", 10: "blocked"}.get(code, "failed"),
        "errno": None if code == 0 else "EPERM" if code == 10 else "CHILD_FAILURE",
    }


if __name__ == "__main__":
    outcome = attempt(json.loads(sys.argv[1]))
    raise SystemExit({"delivered": 0, "blocked": 10}.get(outcome["outcome"], 20))
