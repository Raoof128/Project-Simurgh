"""Bounded JSONL transport to the credential-free native workflow process."""

import json
import os
import select
import subprocess
import tempfile

from study import HERE, ROOT, loads

PYTHON = "/workspace/.venvs/simurgh-assurance-workflow/bin/python"
DEPENDENCIES = (
    "assurance-workflow",
    "assurance-redis",
    "assurance-durable",
    "assurance-sdk",
    "assurance-isolation",
)


class Client:
    def __init__(self, python=PYTHON):
        self.errors = tempfile.TemporaryFile()  # noqa: SIM115 -- owned by Client.close
        self.process = subprocess.Popen(
            [python, str(HERE / "runtime.py")],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=self.errors,
            env={
                "PYTHONDONTWRITEBYTECODE": "1",
                "LC_ALL": "C.UTF-8",
                "PYTHONPATH": os.pathsep.join(
                    str(ROOT / "tools" / d) for d in DEPENDENCIES
                ),
                "SIMURGH_REDIS_SERVER": os.environ.get(
                    "SIMURGH_REDIS_SERVER",
                    "/workspace/.tools/redis-8.10.2/redis-server",
                ),
            },
            cwd=ROOT,
        )

    def request(self, value):
        data = (json.dumps(value, allow_nan=False) + "\n").encode()
        if len(data) > 65536:
            raise ValueError("runtime request too large")
        self.process.stdin.write(data)
        self.process.stdin.flush()
        if not select.select([self.process.stdout], [], [], 60)[0]:
            raise TimeoutError("native workflow timeout")
        line = self.process.stdout.readline(262145)
        if not line or len(line) > 262144 or not line.endswith(b"\n"):
            raise ValueError("native workflow response envelope")
        result = loads(line)
        if not isinstance(result, dict) or result.get("status") == "protocol_error":
            raise ValueError("native workflow refused request")
        expected = {"start": "ready", "close": "closed"}.get(value.get("op"))
        if expected is not None and result.get("status") != expected:
            raise ValueError("native workflow initialization/closure failed")
        if result.get("reason") in (
            "protocol_size",
            "protocol_or_initialization_failed",
        ):
            raise ValueError("native workflow protocol refusal")
        return result

    def close(self):
        if self.process.poll() is None:
            self.process.stdin.close()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        self.process.stdout.close()
        self.errors.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
