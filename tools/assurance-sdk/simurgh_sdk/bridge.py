# SPDX-License-Identifier: AGPL-3.0-or-later
"""Bounded local IPC client; the Node process owns authority and replay state."""

import json
import os
import selectors
import shutil
import signal
import subprocess
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BRIDGE = ROOT / "tools/assurance-sdk/bridge.mjs"
NODE = shutil.which("node")
MAX_LINE = 65536


def parse_json(text):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate_json_key")
            result[key] = value
        return result

    return json.loads(
        text,
        object_pairs_hook=unique,
        parse_constant=lambda value: (_ for _ in ()).throw(
            ValueError("nonfinite_json")
        ),
    )


def load_scenarios():
    if NODE is None:
        raise RuntimeError("node_required")
    result = subprocess.run(
        [NODE, str(BRIDGE), "--dataset"],
        env={},
        capture_output=True,
        check=True,
        timeout=15,
    )
    return parse_json(result.stdout)


class Bridge:
    def __init__(self, scenario_id, mode, *, timeout=15):
        if NODE is None:
            raise RuntimeError("node_required")
        self._temporary = tempfile.TemporaryDirectory(prefix="simurgh-sdk-")
        self.directory = self._temporary.name
        self.timeout = timeout
        self._id = 0
        self._lock = threading.Lock()
        self._closed = False
        self.process = None
        self._selector = selectors.DefaultSelector()
        try:
            self.process = subprocess.Popen(
                [NODE, str(BRIDGE)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                env={"TMPDIR": self.directory},
                start_new_session=True,
            )
            os.set_blocking(self.process.stdin.fileno(), False)
            self._selector.register(self.process.stdout, selectors.EVENT_READ)
            self.request("initialize", scenarioId=scenario_id, mode=mode)
        except BaseException:
            self.close()
            raise

    def request(self, operation, **arguments):
        with self._lock:
            if self._closed or self.process.poll() is not None:
                raise RuntimeError("bridge_closed")
            self._id += 1
            payload = (
                json.dumps(
                    {"id": self._id, "op": operation, **arguments}, allow_nan=False
                ).encode()
                + b"\n"
            )
            if len(payload) - 1 > MAX_LINE:
                raise ValueError("request_too_large")
            try:
                deadline = time.monotonic() + self.timeout
                with selectors.DefaultSelector() as writable:
                    writable.register(self.process.stdin, selectors.EVENT_WRITE)
                    sent = 0
                    while sent < len(payload):
                        if not writable.select(max(0, deadline - time.monotonic())):
                            raise TimeoutError("bridge_timeout")
                        try:
                            sent += os.write(
                                self.process.stdin.fileno(), payload[sent:]
                            )
                        except BlockingIOError:
                            continue
                response = b""
                while not response.endswith(b"\n"):
                    if not self._selector.select(max(0, deadline - time.monotonic())):
                        raise TimeoutError("bridge_timeout")
                    part = os.read(self.process.stdout.fileno(), MAX_LINE + 1)
                    if not part:
                        raise RuntimeError("bridge_closed")
                    response += part
                    if len(response) > MAX_LINE:
                        raise RuntimeError("reply_too_large")
                    if time.monotonic() > deadline:
                        raise TimeoutError("bridge_timeout")
                reply = parse_json(response)
                if (
                    not isinstance(reply, dict)
                    or reply.get("id") != self._id
                    or set(reply) not in ({"id", "result"}, {"id", "error"})
                ):
                    raise RuntimeError("invalid_bridge_reply")
            except BaseException:
                self.close()
                raise
            if "error" in reply:
                raise RuntimeError(reply["error"])
            return reply["result"]

    def execute(self, action):
        return self.request("execute", action=action)

    def snapshot(self):
        return self.request("snapshot")

    def finish(self):
        return self.request("finish")

    def close(self):
        if self._closed:
            return
        self._closed = True
        if self.process is not None:
            try:
                if self.process.stdin:
                    self.process.stdin.close()
                self.process.wait(timeout=3)
            except (BrokenPipeError, subprocess.TimeoutExpired):
                pass
            # Include any sink orphan after a bridge crash; it shares this isolated process group.
            try:
                os.killpg(self.process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            self.process.wait(timeout=3)
            if self.process.stdout:
                self.process.stdout.close()
        self._selector.close()
        self._temporary.cleanup()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
