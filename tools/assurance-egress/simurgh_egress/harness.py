"""Execute the frozen scope broker against an actual, optionally filtered service."""

import http.client
import json
import select
import socket
import subprocess
import sys
import tempfile
from pathlib import Path

from simurgh_scope.broker import Broker

from .kernel import Refusal
from .observer import Observer

ROOT = Path(__file__).resolve().parents[3]
CASES = (
    "public_read",
    "approved_write",
    "tcp_ipv4",
    "tcp_ipv6",
    "udp_dns_ipv4",
    "udp_dns_ipv6",
    "unix_relay",
    "proxy_relay",
    "fork_relay",
    "exec_relay",
    "inherited_socket",
    "filesystem_mailbox",
)
CONTROLS = ("unfiltered", "kernel", "deny_all")


def worker_environment():
    # Scripted fixture has no need for credentials, inherited proxies or host identity.
    return {
        "PYTHONPATH": str(ROOT / "tools/assurance-egress")
        + ":"
        + str(ROOT / "tools/assurance-scope"),
        "PYTHONDONTWRITEBYTECODE": "1",
        "LC_ALL": "C.UTF-8",
    }


class Connection(http.client.HTTPConnection):
    def __init__(self, path):
        super().__init__("approved.test", timeout=5)
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.path)


def run_case(case, control):
    if case not in CASES or control not in CONTROLS:
        raise Refusal("unknown case/control")
    with tempfile.TemporaryDirectory(prefix="se-") as directory:
        root = Path(directory)
        observer = Observer(root, case)
        worker = None
        listener = None
        leaked = None
        service = None
        try:
            observer.start()
            request = {
                "run": "run-1",
                "principal": "researcher-1",
                "tenant": "tenant-1",
                "method": "POST" if case == "approved_write" else "GET",
                "url": "http://approved.test/approved",
                "body": "approved" if case == "approved_write" else "",
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
            if control != "deny_all":
                listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                listener.bind(str(root / "in.sock"))
                listener.listen(4)
                config = {
                    "case": case,
                    "control": control,
                    "listener": listener.fileno(),
                    "probe": observer.config,
                    "approved_file": str(root / "approved"),
                }
                fds = [listener.fileno()]
                if case == "inherited_socket":
                    leaked = socket.create_connection(
                        tuple(observer.config["address"]), timeout=2
                    )
                    config["leaked_fd"] = leaked.fileno()
                    fds.append(leaked.fileno())
                config_path = root / "worker.json"
                config_path.write_text(json.dumps(config))
                worker = subprocess.Popen(
                    [sys.executable, "-m", "simurgh_egress.worker", str(config_path)],
                    pass_fds=fds,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    env=worker_environment(),
                )
                if leaked:
                    leaked.close()
                if not select.select([worker.stdout], [], [], 10)[0]:
                    raise Refusal("worker readiness timeout")
                ready = worker.stdout.readline()
                if not ready:
                    raise Refusal(
                        "worker failed before readiness: " + worker.stderr.read(2048)
                    )
                if json.loads(ready) != {"ready": True, "profile": control}:
                    raise Refusal("invalid readiness")

            def transport(_):
                nonlocal service
                connection = Connection(str(root / "in.sock"))
                try:
                    connection.request(
                        request["method"], "/approved", body=request["body"]
                    )
                    response = connection.getresponse()
                    data = response.read(4097)
                    if len(data) > 4096:
                        raise Refusal("oversize service response")
                    service = json.loads(data)
                    return {"status": response.status, "location": None}
                finally:
                    connection.close()

            broker = Broker(root / "run.sqlite", policy, transport, mode=mode).execute(
                request
            )
            if worker:
                stdout, stderr = worker.communicate(timeout=10)
                if worker.returncode != 0 or stdout or stderr:
                    raise Refusal(
                        "worker failed or emitted unexpected output: " + stderr[:2048]
                    )
            observed = observer.finish()
            approved_write = (
                (root / "approved").read_bytes() == b"approved"
                if (root / "approved").exists()
                else False
            )
            if control != "deny_all" and service is None:
                raise Refusal("no service result; this is not a containment result")
            return {
                "case": case,
                "control": control,
                "broker": broker,
                "service": service,
                "observed": observed,
                "approvedWrite": approved_write,
            }
        finally:
            if worker:
                if worker.poll() is None:
                    worker.kill()
                worker.communicate()
            if listener:
                listener.close()
            if leaked:
                leaked.close()
            observer.close()
