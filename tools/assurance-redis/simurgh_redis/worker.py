# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fresh start-gated clients; no inherited credentials."""

import os
import selectors
import subprocess
import sys
from pathlib import Path

from simurgh_durable.store import canonical, parse_json

from .connector import Connector
from .network import local_sockets_only

ROOT = Path(__file__).resolve().parents[3]


def run_workers(root, endpoint, actions):
    if not 1 <= len(actions) <= 16:
        raise ValueError("invalid_worker_count")
    payloads = [canonical(action).encode() for action in actions]
    if any(len(payload) > 4096 for payload in payloads):
        raise ValueError("fixture_request_too_large")
    processes = []
    try:
        for _ in actions:
            processes.append(
                subprocess.Popen(
                    [
                        sys.executable,
                        "-m",
                        "simurgh_redis.worker",
                        str(root),
                        str(endpoint),
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env={
                        "PYTHONPATH": os.pathsep.join(
                            str(ROOT / "tools" / name)
                            for name in ("assurance-redis", "assurance-durable")
                        ),
                        "PYTHONDONTWRITEBYTECODE": "1",
                    },
                )
            )
        for process in processes:
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                if (
                    not selector.select(10)
                    or os.read(process.stdout.fileno(), 6) != b"ready\n"
                ):
                    raise RuntimeError("worker_start_failed")
        for process, payload in zip(processes, payloads, strict=True):
            process.stdin.write(payload)
            process.stdin.close()
            process.stdin = None
        rows = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=10)
            if process.returncode or stderr or len(stdout) > 65536:
                raise RuntimeError("worker_failed")
            rows.append({"pid": process.pid, "result": parse_json(stdout)})
        return rows
    finally:
        for process in processes:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=3)
            for stream in (process.stdin, process.stdout, process.stderr):
                if stream is not None:
                    stream.close()


def main():
    print("ready", flush=True)
    payload = sys.stdin.buffer.read(65537)
    if len(payload) > 65536:
        raise ValueError("request_too_large")
    with local_sockets_only():
        result = Connector(sys.argv[1], sys.argv[2]).execute(parse_json(payload))
    print(canonical(result), flush=True)


if __name__ == "__main__":
    main()
