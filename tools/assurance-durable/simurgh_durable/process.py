# SPDX-License-Identifier: AGPL-3.0-or-later
"""Start-gated independent workers, with bounded startup and result collection."""

import os
import selectors
import signal
import subprocess
import sys
from pathlib import Path

from .store import canonical, parse_json

PACKAGE = Path(__file__).resolve().parents[1]


def run_workers(root, requests, *, volatile=False):
    if not requests or len(requests) > 16:
        raise ValueError("invalid_worker_count")
    payloads = [(canonical(request) + "\n").encode("utf-8") for request in requests]
    # Keep harness writes below a POSIX pipe's minimum capacity; requests here are fixtures.
    if any(len(payload) > 4096 for payload in payloads):
        raise ValueError("harness_request_too_large")
    processes = []
    try:
        for _ in requests:
            process = subprocess.Popen(
                [sys.executable, "-m", "simurgh_durable.worker", str(root)]
                + (["--volatile"] if volatile else []),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={"PYTHONPATH": str(PACKAGE), "PYTHONDONTWRITEBYTECODE": "1"},
                start_new_session=True,
            )
            processes.append(process)
        # All processes must be alive and ready before any receives an action.
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
        results = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=15)
            if stderr or len(stdout) > 65536:
                raise RuntimeError("worker_protocol_failed")
            result = parse_json(stdout) if stdout else None
            if process.returncode not in (0, 1, -signal.SIGKILL):
                raise RuntimeError("unexpected_worker_exit")
            if process.returncode in (0, 1) and type(result) is not dict:
                raise RuntimeError("missing_worker_result")
            results.append(
                {"pid": process.pid, "returncode": process.returncode, "result": result}
            )
        return results
    finally:
        for process in processes:
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            process.wait(timeout=5)
            for stream in (process.stdin, process.stdout, process.stderr):
                if stream is not None:
                    stream.close()
