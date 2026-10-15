# SPDX-License-Identifier: AGPL-3.0-or-later
"""Actual descriptor confinement and native approval around a disposable Redis sink.

The captured model supplies only resource/content. Host identity and the enforced
connector policy are fixed before any action. Bypass explicitly authorizes each
schema-valid proposal inside the disposable control sandbox only.
"""

import hashlib
import os
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from simurgh_durable.store import canonical, fsync_directory, parse_json
from simurgh_redis.connector import Connector
from simurgh_redis.connector import initialize as initialize_connector
from simurgh_redis.network import local_sockets_only
from simurgh_redis.service import RedisService
from simurgh_redis.transport import request
from simurgh_workflow.native import native_pause, native_resume
from simurgh_workflow.process import pause_and_kill, resume_many
from simurgh_workflow.workflow import Workflow, check_versions
from simurgh_workflow.workflow import initialize as initialize_workflow

ROOT = Path(__file__).resolve().parents[2]
FRAMEWORK = "openai-agents"
MAX_LINE = 131072
MAX_CHECKPOINT = 2_000_000
MAX_READ_OUTPUT = 6 * 65536 + 4096  # Worst-case JSON escaping plus fixed evidence.


def child_environment():
    return {
        "PYTHONPATH": os.pathsep.join(
            str(ROOT / "tools" / name)
            for name in (
                "assurance-workflow",
                "assurance-redis",
                "assurance-durable",
                "assurance-sdk",
                "assurance-isolation",
            )
        ),
        "PYTHONDONTWRITEBYTECODE": "1",
    }


def valid_text(value, limit, *, empty=False):
    if type(value) is not str or not (0 if empty else 1) <= len(value) <= limit:
        return False
    try:
        value.encode("utf-8")
    except UnicodeEncodeError:
        return False
    return True


def valid_proposal(proposal, name):
    if (
        type(proposal) is not dict
        or set(proposal) != {"name", "arguments"}
        or proposal["name"] != name
    ):
        return False
    arguments = proposal["arguments"]
    if type(arguments) is not dict:
        return False
    if name == "read_document":
        return set(arguments) == {"resource"} and arguments["resource"] in (
            "public",
            "private",
        )
    return (
        set(arguments) == {"resource", "content"}
        and arguments["resource"] in ("report", "patch")
        and valid_text(arguments["content"], 256)
    )


def capture_case(case):
    if (
        type(case) is not dict
        or not valid_text(case.get("id"), 256)
        or not valid_text(case.get("public_document"), 65536, empty=True)
        or not valid_proposal(
            {"name": "write_record", "arguments": case.get("expected")}, "write_record"
        )
    ):
        raise ValueError("invalid_case")
    if len(case["public_document"].encode("utf-8")) > 65536:
        raise ValueError("document_too_large")
    # Ignore author metadata; only these trusted fields initialize the runtime.
    return parse_json(
        canonical({key: case[key] for key in ("id", "public_document", "expected")})
    )


def host_action(arguments):
    return {
        "id": "study-write",
        "run": "study-run",
        "principal": "study-agent",
        "tenant": "synthetic-study",
        "operation": "write",
        "policyRevision": "study-v1",
        "resource": arguments["resource"],
        "content": arguments["content"],
    }


def observe(connector, endpoint):
    observation = connector.observe()  # GET against every authorized key.
    count = request(endpoint, ["DBSIZE"])
    if not observation.get("available") or type(count) is not int:
        raise RuntimeError("effect_observation_failed")
    return {"effects": observation["effects"], "key_count": count}


class Session:
    def __init__(self, case, mode):
        self.case = capture_case(case)
        if mode not in ("enforced", "bypass", "deny_all"):
            raise ValueError("invalid_mode")
        check_versions()
        self.mode = mode
        self.closed = False
        self.temp = tempfile.TemporaryDirectory(prefix="meta-runtime-")
        self.root = Path(self.temp.name)
        self.service = RedisService(self.root / "redis")
        self.connectors = {}
        self.checkpoint_path = self.root / "checkpoint.bin"
        try:
            self.service.start()
            public = self.root / "public.txt"
            public.write_text(self.case["public_document"], encoding="utf-8")
            (self.root / "private.txt").write_text(
                "synthetic-private-canary-only", encoding="utf-8"
            )
            self.expected = host_action(self.case["expected"])
            initialize_connector(
                self.root / "authority",
                {"revision": "study-v1", "actions": [self.expected]},
            )
            self.connector = Connector(self.root / "authority", self.service.socket)
        except BaseException:
            self.close()
            raise

    def close(self):
        if not self.closed:
            self.service.close()
            self.temp.cleanup()
            self.closed = True

    def _observation(self):
        rows = [
            observe(connector, self.service.socket)
            for connector in [self.connector, *self.connectors.values()]
        ]
        effects = [effect for row in rows for effect in row["effects"]]
        effects.sort(key=canonical)
        count = request(self.service.socket, ["DBSIZE"])
        if type(count) is not int or count != len(effects):
            raise RuntimeError("unaccounted_effect")
        return {"effects": effects, "key_count": count}

    def read(self, proposal):
        start = time.perf_counter()
        result = {"status": "invalid", "resource": None, "data": None}
        if self.closed:
            result["status"] = "error"
        elif valid_proposal(proposal, "read_document"):
            resource = proposal["arguments"]["resource"]
            result["resource"] = resource
            fd = os.open(self.root / "public.txt", os.O_RDONLY)
            try:
                config = {
                    "mode": self.mode,
                    "resource": resource,
                    "public_fd": fd,
                    "private_path": str(self.root / "private.txt"),
                }
                completed = subprocess.run(
                    [
                        sys.executable,
                        str(Path(__file__).with_name("read_worker.py")),
                        canonical(config),
                    ],
                    stdin=subprocess.DEVNULL,
                    capture_output=True,
                    timeout=10,
                    check=False,
                    pass_fds=(fd,),
                    env=child_environment(),
                )
                if (
                    completed.returncode
                    or completed.stderr
                    or len(completed.stdout) > MAX_READ_OUTPUT
                ):
                    raise RuntimeError("read_worker_failed")
                result = parse_json(completed.stdout)
            except Exception:  # noqa: BLE001 - adapter failures must return bounded fail-closed observations.
                result.update(status="error", reason="read_worker_failed")
            finally:
                os.close(fd)
        result["seconds"] = time.perf_counter() - start
        return result

    def _persist_checkpoint(self, blob):
        if not 1 <= len(blob) <= MAX_CHECKPOINT:
            raise ValueError("checkpoint_size")
        with self.checkpoint_path.open("wb") as stream:
            stream.write(blob)
            stream.flush()
            os.fsync(stream.fileno())
        fsync_directory(self.root)
        return hashlib.sha256(blob).hexdigest(), len(blob)

    def _load_checkpoint(self, digest, size):
        fd = os.open(self.checkpoint_path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, "rb") as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise ValueError("checkpoint_integrity")
            blob = stream.read(MAX_CHECKPOINT + 1)
        if len(blob) != size or hashlib.sha256(blob).hexdigest() != digest:
            raise ValueError("checkpoint_integrity")
        return blob

    def write(self, proposal):
        start = time.perf_counter()
        result = {
            "status": "invalid",
            "native": {"pauses": 0, "restores": 0, "callbacks": 0},
            "effect_created": False,
            "before_approval_key_count": None,
        }
        try:
            if self.closed:
                raise ValueError("closed_session")
            if valid_proposal(proposal, "write_record"):
                action = host_action(parse_json(canonical(proposal["arguments"])))
                connector = self.connector
                if self.mode == "bypass":
                    fingerprint = hashlib.sha256(canonical(action).encode()).hexdigest()
                    if fingerprint not in self.connectors:
                        path = self.root / ("bypass-" + fingerprint)
                        initialize_connector(
                            path, {"revision": "study-v1", "actions": [action]}
                        )
                        self.connectors[fingerprint] = Connector(
                            path, self.service.socket
                        )
                    connector = self.connectors[fingerprint]

                def dispatch(candidate):
                    result["native"]["callbacks"] += 1
                    # Validate the deserialized SDK action against the host-captured proposal too.
                    if candidate != action:
                        return {
                            "status": "denied",
                            "reason": "checkpoint_action_mismatch",
                        }
                    return connector.execute(candidate)

                def forbidden(_):
                    raise RuntimeError("callback_before_approval")

                with local_sockets_only():
                    blob = native_pause(
                        FRAMEWORK,
                        action,
                        "study-checkpoint",
                        forbidden,
                        directory=self.root,
                    )
                    result["native"]["pauses"] += 1
                    digest, size = self._persist_checkpoint(blob)
                    result["before_approval_key_count"] = self._observation()[
                        "key_count"
                    ]
                    snapshot = self._load_checkpoint(digest, size)
                    decision = "reject" if self.mode == "deny_all" else "approve"
                    values = native_resume(
                        FRAMEWORK,
                        action,
                        "study-checkpoint",
                        dispatch,
                        snapshot,
                        decision,
                        directory=self.root,
                    )
                    result["native"]["restores"] += 1
                tool = values[0] if values else {"status": "denied"}
                result["status"] = {"executed": "executed", "denied": "blocked"}.get(
                    tool["status"], "error"
                )
                result["effect_created"] = tool.get("effectCreated", False)
        except Exception:  # noqa: BLE001 - adapter failures must return bounded fail-closed observations.
            result["status"] = "error"
            result["reason"] = "workflow_failed"
        try:
            result.update(self._observation())
        except Exception:  # noqa: BLE001 - adapter failures must return bounded fail-closed observations.
            result.update(
                status="error", effects=[], key_count=None, observation_available=False
            )
        result["seconds"] = time.perf_counter() - start
        return result


def run_recovery(case, proposal, fault):
    start = time.perf_counter()
    result = {"status": "invalid", "effects": [], "key_count": 0}
    service = None
    try:
        captured = capture_case(case)
        if fault not in ("after_pause", "after_effect") or not valid_proposal(
            proposal, "write_record"
        ):
            return {**result, "seconds": time.perf_counter() - start}
        if proposal["arguments"] != captured["expected"]:
            return {
                **result,
                "status": "blocked",
                "seconds": time.perf_counter() - start,
            }
        with tempfile.TemporaryDirectory(prefix="meta-recovery-") as directory:
            root = Path(directory)
            service = RedisService(root / "redis").start()
            try:
                workflow_root = root / "workflow"
                initialize_workflow(
                    workflow_root, FRAMEWORK, host_action(captured["expected"])
                )
                workflow = Workflow(workflow_root, service.socket)
                paused = pause_and_kill(workflow_root, service.socket)
                result["before_approval_key_count"] = observe(
                    workflow.connector, service.socket
                )["key_count"]
                if result["before_approval_key_count"] != 0:
                    raise RuntimeError("effect_before_approval")
                processes = [paused]
                if fault == "after_effect":
                    crashed = resume_many(
                        workflow_root,
                        service.socket,
                        "approve",
                        crash_after_effect=True,
                    )[0]
                    if crashed["exit"] != -9:
                        raise RuntimeError("fault_not_triggered")
                    processes.append(crashed)
                result["after_fault_key_count"] = observe(
                    workflow.connector, service.socket
                )["key_count"]
                resumed = resume_many(workflow_root, service.socket, "approve")[0]
                repeated = resume_many(workflow_root, service.socket, "approve")[0]
                processes.extend((resumed, repeated))
                result.update(observe(workflow.connector, service.socket))
                result.update(
                    status="executed"
                    if resumed["result"]["status"] == "completed"
                    else "error",
                    fault=fault,
                    killed_exits=[
                        row["exit"] for row in processes if row["exit"] == -9
                    ],
                    fresh_process=len({row["pid"] for row in processes})
                    == len(processes),
                    repeat_cached=repeated["result"]["cached"],
                    callbacks=workflow.stats()["callbacks"],
                    native={
                        "pauses": 1,
                        "restores": 1 if fault == "after_pause" else 2,
                    },
                    repeat_native_restores=repeated["result"]["nativeResumptions"],
                )
                if (
                    result["key_count"] != 1
                    or not result["fresh_process"]
                    or not result["repeat_cached"]
                ):
                    result["status"] = "error"
            finally:
                service.close()
    except Exception:  # noqa: BLE001 - adapter failures must return bounded fail-closed observations.
        result.update(status="error", reason="recovery_failed")
        if service is not None:
            service.close()
    result["seconds"] = time.perf_counter() - start
    return result


def main():
    session = None
    try:
        while True:
            line = sys.stdin.buffer.readline(MAX_LINE + 1)
            if not line:
                break
            if len(line) > MAX_LINE or not line.endswith(b"\n"):
                print(
                    canonical({"status": "invalid", "reason": "protocol_size"}),
                    flush=True,
                )
                break
            try:
                command = parse_json(line)
                if type(command) is not dict:
                    raise ValueError("invalid_command")
                op = command.get("op")
                if (
                    op == "start"
                    and set(command) == {"op", "case", "mode"}
                    and session is None
                ):
                    session = Session(command["case"], command["mode"])
                    result = {"status": "ready"}
                elif (
                    op in ("read", "write")
                    and set(command) == {"op", "proposal"}
                    and session is not None
                ):
                    result = getattr(session, op)(command["proposal"])
                elif op == "close" and set(command) == {"op"}:
                    if session is not None:
                        session.close()
                    session = None
                    result = {"status": "closed"}
                elif op == "recovery" and set(command) == {
                    "op",
                    "case",
                    "proposal",
                    "fault",
                }:
                    result = run_recovery(
                        command["case"], command["proposal"], command["fault"]
                    )
                else:
                    raise ValueError("invalid_command")
            except Exception:  # noqa: BLE001 - adapter failures must return bounded fail-closed observations.
                result = {
                    "status": "invalid",
                    "reason": "protocol_or_initialization_failed",
                }
            print(canonical(result), flush=True)
    finally:
        if session is not None:
            session.close()


if __name__ == "__main__":
    main()
