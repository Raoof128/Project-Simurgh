# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fresh start-gated application processes with bounded output and explicit SIGKILL."""

import os
import selectors
import signal
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

from simurgh_durable.store import canonical, parse_json

from .workflow import Workflow

ROOT = Path(__file__).resolve().parents[3]


def read_line(stream, limit=65536, timeout=20):
    output = bytearray()
    deadline = time.monotonic() + timeout
    with selectors.DefaultSelector() as selector:
        selector.register(stream, selectors.EVENT_READ)
        while len(output) <= limit:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not selector.select(remaining):
                raise TimeoutError("worker_timeout")
            value = os.read(stream.fileno(), 1)
            if not value:
                raise RuntimeError("worker_output_lost")
            if value == b"\n":
                return bytes(output)
            output.extend(value)
    raise ValueError("worker_output_too_large")


def spawn():
    return subprocess.Popen(
        [sys.executable, "-m", "simurgh_workflow.process"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={
            "PYTHONPATH": os.pathsep.join(
                str(ROOT / "tools" / name)
                for name in (
                    "assurance-workflow",
                    "assurance-redis",
                    "assurance-durable",
                    "assurance-sdk",
                )
            ),
            "PYTHONDONTWRITEBYTECODE": "1",
        },
    )


def cleanup(process):
    if process.poll() is None:
        process.kill()
    process.wait(timeout=5)
    for stream in (process.stdin, process.stdout, process.stderr):
        if stream is not None:
            stream.close()


def send(process, payload):
    process.stdin.write(canonical(payload).encode())
    process.stdin.close()
    process.stdin = None


def pause_and_kill(root, endpoint):
    process = spawn()
    try:
        if read_line(process.stdout) != b"ready":
            raise RuntimeError("worker_not_ready")
        send(process, {"root": str(root), "endpoint": str(endpoint), "mode": "pause"})
        result = parse_json(read_line(process.stdout))
        if result != {"status": "paused", "interruptions": 1, "callbacks": 0}:
            raise RuntimeError("worker_not_paused")
        process.kill()
        code = process.wait(timeout=5)
        stdout, stderr = process.communicate(timeout=5)
        if code != -9 or stdout or stderr:
            raise RuntimeError("pause_kill_failed")
        return {"pid": process.pid, "exit": code, "result": result}
    finally:
        cleanup(process)


def resume_many(root, endpoint, decision, *, count=1, crash_after_effect=False):
    if type(count) is not int or not 1 <= count <= 4:
        raise ValueError("invalid_worker_count")
    processes = []
    try:
        for _ in range(count):
            processes.append(spawn())
        for process in processes:
            if read_line(process.stdout) != b"ready":
                raise RuntimeError("worker_not_ready")
        for process in processes:
            send(
                process,
                {
                    "root": str(root),
                    "endpoint": str(endpoint),
                    "mode": "resume",
                    "decision": decision,
                    "crash": crash_after_effect,
                },
            )
        rows = []
        for process in processes:
            stdout, stderr = process.communicate(timeout=30)
            code = process.returncode
            if (
                stderr
                or len(stdout) > 65536
                or code not in (0, -9)
                or (code == -9 and not crash_after_effect)
            ):
                raise RuntimeError("resume_worker_failed")
            if code == -9 and stdout:
                raise RuntimeError("crashed_worker_returned_result")
            rows.append(
                {
                    "pid": process.pid,
                    "exit": code,
                    "result": None if code == -9 else parse_json(stdout),
                }
            )
        return rows
    finally:
        for process in processes:
            cleanup(process)


def main():
    print("ready", flush=True)
    payload = sys.stdin.buffer.read(65537)
    if len(payload) > 65536:
        raise ValueError("worker_input_too_large")
    args = parse_json(payload)
    workflow = Workflow(args["root"], args["endpoint"])
    try:
        if args["mode"] == "pause":
            result = workflow.pause()
        else:
            result = workflow.resume(args["decision"], crash_after_effect=args["crash"])
    except (OSError, ValueError, sqlite3.Error) as error:
        result = {
            "status": "refused",
            "reason": str(error) if type(error) is ValueError else type(error).__name__,
        }
    print(canonical(result), flush=True)
    if args["mode"] == "pause" and result["status"] == "paused":
        signal.pause()


if __name__ == "__main__":
    main()
