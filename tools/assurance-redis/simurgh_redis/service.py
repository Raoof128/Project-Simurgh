# SPDX-License-Identifier: AGPL-3.0-or-later
"""Disposable real Redis, TCP disabled, with persisted AOF across process restart."""

import os
import re
import subprocess
import time
from pathlib import Path

from .transport import request

VERSION = "8.10.2"


class RedisService:
    def __init__(self, directory):
        self.directory = Path(directory).absolute()
        self.socket = self.directory / "redis.sock"
        self.binary = os.environ.get(
            "SIMURGH_REDIS_SERVER", "/workspace/.tools/redis-8.10.2/redis-server"
        )
        self.process = None

    def start(self):
        if self.process is not None and self.process.poll() is None:
            raise RuntimeError("server_already_running")
        version = subprocess.run(
            [self.binary, "--version"],
            capture_output=True,
            timeout=5,
            check=True,
            env={},
        ).stdout.decode()
        if re.search(r"\bv=([^ ]+)", version).group(1) != VERSION:
            raise ValueError("redis_version_mismatch")
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.socket.unlink(missing_ok=True)
        self.process = subprocess.Popen(
            [
                self.binary,
                "--port",
                "0",
                "--unixsocket",
                str(self.socket),
                "--unixsocketperm",
                "700",
                "--dir",
                str(self.directory),
                "--save",
                "",
                "--appendonly",
                "yes",
                "--appendfsync",
                "always",
                "--logfile",
                str(self.directory / "redis.log"),
            ],
            env={},
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline and self.process.poll() is None:
            try:
                if request(self.socket, ["PING"], timeout=0.1) == b"PONG":
                    return self
            except (OSError, ValueError):
                time.sleep(0.01)
        self.close()
        raise RuntimeError("redis_start_failed")

    def kill(self):
        if self.process is None or self.process.poll() is not None:
            raise RuntimeError("redis_not_running")
        self.process.kill()
        return self.process.wait(timeout=3)

    def close(self):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.close()
