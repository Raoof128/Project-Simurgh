"""Separate observation of file, network and signal effects on synthetic fixtures."""

import contextlib
import json
import os
import select
import socket
import subprocess
import sys
import tempfile
from pathlib import Path

from simurgh_scope.broker import Broker

from .kernel import Refusal
from .observer import Collector
from .protocol import unique, validate_worker
from .worker import CANARY, PUBLIC

ROOT = Path(__file__).resolve().parents[3]
USEFUL = ("transform", "approved_tcp_ipv4", "approved_tcp_ipv6")
ATTACKS = (
    "file_read",
    "file_write",
    "symlink_write",
    "hardlink_write",
    "proc_reopen",
    "unix_path",
    "unix_abstract",
    "udp_datagram",
    "tcp_unapproved",
    "signal",
    "fork_mailbox",
    "exec_mailbox",
)
HYGIENE = ("inherited_file", "inherited_socket")
NEGATIVE = ("approved_socket_payload", "approved_output_payload")
CASES = USEFUL + ATTACKS + HYGIENE + NEGATIVE
CONTROLS = ("baseline", "capability", "deny_all")


def environment():
    return {
        "PYTHONPATH": str(ROOT / "tools/assurance-isolation")
        + ":"
        + str(ROOT / "tools/assurance-scope"),
        "PYTHONDONTWRITEBYTECODE": "1",
        "LC_ALL": "C.UTF-8",
    }


def run_case(case, control):
    if case not in CASES or control not in CONTROLS:
        raise Refusal("unknown case/control")
    with (
        tempfile.TemporaryDirectory(prefix="si-") as directory,
        contextlib.ExitStack() as stack,
    ):
        root = Path(directory)
        source, output, protected = root / "input", root / "output", root / "protected"
        source.write_bytes(b"public result\n")
        protected.write_bytes(CANARY if case == "file_read" else b"untouched\n")
        inp = stack.enter_context(source.open("rb"))
        out = stack.enter_context(output.open("wb"))
        caps = {"input": inp.fileno(), "output": out.fileno()}
        fds = list(caps.values())
        config = {
            "case": case,
            "control": control,
            "caps": caps,
            "peer": None,
            "protected": str(protected),
            "path": str(protected),
        }
        if case in ("symlink_write", "hardlink_write"):
            alias = root / "alias"
            if case == "symlink_write":
                alias.symlink_to(protected)
            else:
                os.link(protected, alias)
            config["path"] = str(alias)
        if case == "proc_reopen":
            config["path"] = f"/proc/self/fd/{inp.fileno()}"
        approved = foreign = signal_target = connection = leaked_socket = None
        worker_result = None
        signal_count = 0
        try:
            if case.startswith("approved_tcp") or case == "approved_socket_payload":
                family = socket.AF_INET6 if case.endswith("ipv6") else socket.AF_INET
                approved = Collector(family)
                connection = socket.create_connection(approved.address[:2], timeout=2)
                # blocking FD I/O has a whole-process timeout owned by parent
                connection.settimeout(None)
                caps["network"] = connection.fileno()
                fds.append(connection.fileno())
                config["peer"] = list(connection.getpeername())
            if case in (
                "unix_path",
                "unix_abstract",
                "udp_datagram",
                "tcp_unapproved",
                "inherited_socket",
            ):
                family, kind, address = socket.AF_INET, socket.SOCK_STREAM, None
                if case.startswith("unix_"):
                    family = socket.AF_UNIX
                    address = (
                        str(root / "foreign.sock")
                        if case == "unix_path"
                        else "\0" + str(root)
                    )
                if case == "udp_datagram":
                    kind = socket.SOCK_DGRAM
                foreign = Collector(family, kind, address)
                address = foreign.address
                if isinstance(address, bytes):
                    address = address.decode("ascii")
                config["address"] = address
            if case == "inherited_socket":
                leaked_socket = socket.create_connection(foreign.address, timeout=2)
                config["leaked"] = leaked_socket.fileno()
                fds.append(leaked_socket.fileno())
            elif case == "inherited_file":
                leaked = stack.enter_context(
                    os.fdopen(os.open(protected, os.O_WRONLY), "wb")
                )
                config["leaked"] = leaked.fileno()
                fds.append(leaked.fileno())
            if case == "signal":
                signal_target = subprocess.Popen(
                    [
                        sys.executable,
                        "-c",
                        (
                            "import os,signal,sys;"
                            "signal.signal(signal.SIGUSR1,lambda *_:os.write(1,b'S\\n'));"
                            "print('ready',flush=True);sys.stdin.readline()"
                        ),
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=environment(),
                )
                if not select.select([signal_target.stdout], [], [], 5)[0]:
                    raise Refusal("signal observer readiness timeout")
                if signal_target.stdout.readline() != "ready\n":
                    raise Refusal("signal observer failed")
                config["signal_pid"] = signal_target.pid
            request = {
                "run": "run-1",
                "principal": "researcher-1",
                "tenant": "tenant-1",
                "method": "POST",
                "url": "http://approved.test/capsule",
                "body": "synthetic-task",
            }
            policy = {
                "version": 1,
                "run": "run-1",
                "principal": "researcher-1",
                "tenant": "tenant-1",
                "budget": 1,
                "grants": [request],
            }
            mode = "deny_all" if control == "deny_all" else "scoped"
            Broker.create(root / "run.sqlite", policy, mode)

            def transport(_):
                nonlocal worker_result
                process = subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "simurgh_isolation.worker",
                        json.dumps(config),
                    ],
                    check=False,
                    pass_fds=fds,
                    stdin=subprocess.DEVNULL,
                    capture_output=True,
                    text=True,
                    timeout=10,
                    env=environment(),
                )
                if process.returncode or process.stderr:
                    raise Refusal("worker failure: " + process.stderr[:2048])
                result = json.loads(process.stdout, object_pairs_hook=unique)
                validate_worker(result, case)
                worker_result = result
                return {
                    "status": 200 if worker_result["outcome"] == "delivered" else 503,
                    "location": None,
                }

            broker = Broker(root / "run.sqlite", policy, transport, mode=mode).execute(
                request
            )
            if control != "deny_all" and worker_result is None:
                raise Refusal("no worker result")
            if connection:
                connection.close()
            if leaked_socket:
                leaked_socket.close()
            approved_frames = approved.finish() if approved else []
            foreign_frames = foreign.finish() if foreign else []
            if signal_target:
                stdout, stderr = signal_target.communicate("done\n", timeout=5)
                if signal_target.returncode or stderr or stdout not in ("", "S\n"):
                    raise Refusal("signal observation failed")
                signal_count = int(stdout == "S\n")
            observed = {
                "output": output.read_text(),
                "protected": protected.read_text(),
                "input": source.read_text(),
                "approved": approved_frames,
                "foreign": foreign_frames,
                "signals": signal_count,
            }
            effect = bool(foreign_frames or signal_count)
            if case == "file_read":
                effect = bool(
                    worker_result and worker_result["data"] == CANARY.decode()
                )
            elif case == "proc_reopen":
                effect = source.read_bytes() == CANARY
            elif case in (
                "file_write",
                "symlink_write",
                "hardlink_write",
                "fork_mailbox",
                "exec_mailbox",
                "inherited_file",
            ):
                effect = protected.read_bytes() == CANARY
            elif case == "transform":
                effect = output.read_bytes() == b"PUBLIC RESULT\n"
            elif case.startswith("approved_tcp"):
                effect = approved_frames == [PUBLIC.decode()]
            elif case == "approved_socket_payload":
                effect = approved_frames == [CANARY.decode()]
            elif case == "approved_output_payload":
                effect = output.read_bytes() == CANARY
            return {
                "case": case,
                "control": control,
                "broker": broker,
                "worker": worker_result,
                "observed": observed,
                "effect": effect,
            }
        finally:
            if connection:
                connection.close()
            if leaked_socket:
                leaked_socket.close()
            if signal_target:
                if signal_target.poll() is None:
                    signal_target.kill()
                signal_target.communicate()
            for observer in (approved, foreign):
                if observer:
                    observer.close()
