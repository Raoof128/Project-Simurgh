"""Trusted native SDK orchestrator; every executed tool uses an isolated child."""

import os
import selectors
import signal
import subprocess
import sys
import time
from pathlib import Path

from core import decode, encode, valid

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/assurance-workflow"))
from simurgh_workflow.native import native_pause, native_resume


def run_worker(argv, *, timeout=10):
    """Bound pipe memory and wall time; kill the whole owned process group on exit."""
    process = subprocess.Popen(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
        env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
    )
    captured = {"stdout": bytearray(), "stderr": bytearray()}
    total = 0
    deadline = time.monotonic() + timeout
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ, "stdout")
            selector.register(process.stderr, selectors.EVENT_READ, "stderr")
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ValueError("worker_timeout")
                for key, _ in selector.select(remaining):
                    part = os.read(key.fd, min(4096, 16385 - total))
                    if not part:
                        selector.unregister(key.fileobj)
                        continue
                    total += len(part)
                    if total > 16384:
                        raise ValueError("worker_output_limit")
                    captured[key.data].extend(part)
        try:
            code = process.wait(timeout=max(0.001, deadline - time.monotonic()))
        except subprocess.TimeoutExpired as exc:
            raise ValueError("worker_timeout") from exc
        if code or captured["stderr"]:
            raise ValueError("worker_refused")
        return captured["stdout"].decode("utf-8")
    finally:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        process.wait(timeout=5)
        process.stdout.close()
        process.stderr.close()


def isolate(action, directory, *, raw=False):
    wire = action if raw else encode(action)
    if not isinstance(wire, str) or len(wire) > 16384:
        raise ValueError("invalid_proposal")
    stdout = run_worker(
        [
            sys.executable,
            "-B",
            "-E",
            "-s",
            str(Path(__file__).with_name("worker.py")),
            wire,
            str(Path(directory) / "forbidden"),
        ]
    )
    value = decode(stdout)
    if (
        type(value) is not dict
        or set(value) != {"proposal", "probes", "environment_names"}
        or not valid(value["proposal"])
        or value["probes"] != {"path_denied": True, "socket_denied": True}
    ):
        raise ValueError("invalid_worker_output")
    return value


def native_delivery(host, action, directory, *, decision="approve"):
    if decision not in ("approve", "reject"):
        raise ValueError("invalid_host_decision")
    if not valid(action):
        return {"status": "invalid", "native_interrupted": False, "worker": None}
    invoked = []

    def execute(proposal):
        worker = isolate(proposal, directory)
        invoked.append(worker)
        return host.dispatch(worker["proposal"])

    snapshot = native_pause(
        "openai-agents", action, "synthetic-host-workflow", execute, directory=directory
    )
    if invoked:
        raise RuntimeError("execution_before_approval")
    results = native_resume(
        "openai-agents",
        action,
        "synthetic-host-workflow",
        execute,
        snapshot,
        decision,
        directory=directory,
    )
    if decision == "reject":
        return {"status": "refused", "native_interrupted": True, "worker": None}
    if len(results) != 1 or len(invoked) != 1:
        raise RuntimeError("missing_native_result")
    return {**results[0], "native_interrupted": True, "worker": invoked[0]["probes"]}
