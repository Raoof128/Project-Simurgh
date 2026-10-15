"""Trusted bootstrap, then a single scripted task under the selected profile."""

import ctypes
import errno
import json
import os
import signal
import socket
import sys

from .kernel import install, prepare

PUBLIC = b"public request\n"
CANARY = b"synthetic-canary-only\n"


def write_all(fd, data):
    while data:
        count = os.write(fd, data)
        if count <= 0:
            raise RuntimeError("short write")
        data = data[count:]


def exchange(fd, data):
    write_all(fd, data)
    reply = b""
    while len(reply) < 4:
        part = os.read(fd, 4 - len(reply))
        if not part:
            raise RuntimeError("missing collector acknowledgment")
        reply += part
    if reply != b"ACK\n":
        raise RuntimeError("invalid collector acknowledgment")


def probe(config, libc):
    case, caps = config["case"], config["caps"]
    if case == "transform":
        write_all(caps["output"], os.read(caps["input"], 1024).upper())
    elif case.startswith("approved_tcp"):
        exchange(caps["network"], PUBLIC)
    elif case == "approved_socket_payload":
        exchange(caps["network"], CANARY)
    elif case == "approved_output_payload":
        write_all(caps["output"], CANARY)
    elif case == "file_read":
        with open(config["protected"], "rb") as source:
            return source.read().decode("ascii")
    elif case in ("file_write", "symlink_write", "hardlink_write", "proc_reopen"):
        path = config["path"]
        with open(path, "wb") as target:
            target.write(CANARY)
    elif case == "fork_mailbox":
        # glibc's os.fork wrapper uses clone, deliberately not granted by this
        # profile. Exercise the raw x86_64 fork syscall which we do permit.
        pid = libc.syscall(57)
        if pid < 0:
            raise OSError(ctypes.get_errno(), "fork")
        if pid == 0:
            try:
                fd = os.open(config["protected"], os.O_WRONLY | os.O_TRUNC)
                write_all(fd, CANARY)
                os.close(fd)
                os._exit(0)
            except OSError as exc:
                os._exit(10 if exc.errno == errno.EPERM else 20)
        _, status = os.waitpid(pid, 0)
        if status == 10 << 8:
            raise PermissionError(errno.EPERM, "child denied")
        if status != 0:
            raise RuntimeError("child failed")
    elif case == "exec_mailbox":
        # Successful exec inherits all platform filters; the local script also
        # emits the exact result envelope. In the capability profile exec denies.
        script = (
            "import json;from pathlib import Path;"
            f"Path({config['protected']!r}).write_bytes({CANARY!r});"
            "print(json.dumps({'outcome':'delivered','errno':None,'data':None}))"
        )
        os.execv(sys.executable, [sys.executable, "-c", script])
    elif case in ("inherited_file", "inherited_socket"):
        write_all(config["leaked"], CANARY)
    elif case == "signal":
        os.kill(config["signal_pid"], signal.SIGUSR1)
    else:
        family = {"unix_path": socket.AF_UNIX, "unix_abstract": socket.AF_UNIX}.get(
            case, socket.AF_INET
        )
        kind = socket.SOCK_DGRAM if case == "udp_datagram" else socket.SOCK_STREAM
        address = config["address"]
        if family != socket.AF_UNIX:
            address = tuple(address)
        with socket.socket(family, kind) as client:
            client.settimeout(2)
            client.connect(address)
            client.sendall(CANARY)
            if client.recv(4) != b"ACK\n":
                raise RuntimeError("missing observer acknowledgment")
    return None


def main():
    config = json.loads(sys.argv[1])
    libc = ctypes.CDLL(None, use_errno=True)
    libc.syscall.restype = ctypes.c_long
    prepare(config["caps"], config["peer"])
    # Test descriptor hygiene before FD reuse or filtered I/O can obscure it.
    closed = False
    if "leaked" in config:
        try:
            os.fstat(config["leaked"])
        except OSError as exc:
            if exc.errno != errno.EBADF:
                raise
            closed = True
        if not closed:
            raise RuntimeError("descriptor sanitation failed")
    if config["control"] == "capability":
        install(config["caps"])
    if closed:
        result = {"outcome": "closed", "errno": errno.EBADF, "data": None}
    else:
        try:
            data = probe(config, libc)
            result = {"outcome": "delivered", "errno": None, "data": data}
        except OSError as exc:
            if exc.errno != errno.EPERM:
                raise
            result = {"outcome": "blocked", "errno": exc.errno, "data": None}
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
