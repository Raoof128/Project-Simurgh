"""Trusted imports/bootstrap followed by mandatory no-path/no-network seccomp."""

import errno
import os
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-isolation"))
from core import decode, encode, valid
from simurgh_isolation.kernel import install, prepare


def main():
    prepare({}, None)
    install({})
    probes = {}
    try:
        fd = os.open(sys.argv[2], os.O_WRONLY | os.O_CREAT, 0o600)
        os.close(fd)
        probes["path_denied"] = False
    except OSError as exc:
        probes["path_denied"] = exc.errno == errno.EPERM
    try:
        with socket.socket():
            probes["socket_denied"] = False
    except OSError as exc:
        probes["socket_denied"] = exc.errno == errno.EPERM
    if not all(probes.values()):
        raise RuntimeError("isolation_probe_failed")
    proposal = decode(sys.argv[1])
    if not valid(proposal):
        raise ValueError("invalid_proposal")
    print(
        encode(
            {
                "proposal": proposal,
                "probes": probes,
                "environment_names": sorted(os.environ),
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
