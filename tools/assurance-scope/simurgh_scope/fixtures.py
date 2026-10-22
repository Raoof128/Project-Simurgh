"""Actual local HTTP services, all over Unix sockets; no public targets."""

import http.client
import json
import os
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler
from pathlib import Path

from .broker import Refusal, encoded, location

ORIGINS = (
    "http://stats.test",
    "http://packages.test",
    "http://messages.test",
    "http://outside.test",
)
PATHS = {
    "read": ("GET", "http://stats.test/public", ""),
    "write": ("POST", "http://messages.test/runs/run-1", "approved result"),
    "redirect": ("GET", "http://packages.test/redirect", ""),
    "hidden_relay": ("GET", "http://packages.test/approved-relay", ""),
    "missing": ("GET", "http://stats.test/missing", ""),
}


def proposal(kind="read"):
    method, url, body = PATHS[kind]
    return {
        "run": "run-1",
        "principal": "researcher-1",
        "tenant": "tenant-1",
        "method": method,
        "url": url,
        "body": body,
    }


def policy(budget=8):
    return {
        "version": 1,
        "run": "run-1",
        "principal": "researcher-1",
        "tenant": "tenant-1",
        "budget": budget,
        "grants": [proposal(k) for k in PATHS],
    }


def registry(root):
    return {origin: str(Path(root) / f"s{i}.sock") for i, origin in enumerate(ORIGINS)}


class UnixConnection(http.client.HTTPConnection):
    def __init__(self, path):
        super().__init__("fixture.test", timeout=2)
        self.path = path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(self.path)


def send(request, routes):
    origin, path = location(request["url"])
    if origin not in routes:
        raise Refusal("unregistered origin")
    if request.get("method") not in ("GET", "POST") or not isinstance(
        request.get("body"), str
    ):
        raise Refusal("invalid transport request")
    body = request["body"].encode()
    if len(body) > 1024:
        raise Refusal("oversize body")
    connection = UnixConnection(routes[origin])
    try:
        headers = {
            "Host": origin.removeprefix("http://"),
            "X-Fixture-Credential": "present" if "credential" in request else "absent",
        }
        headers.update(
            {"X-Fixture-" + key: request[key] for key in ("run", "principal", "tenant")}
        )
        connection.request(request["method"], path, body=body, headers=headers)
        response = connection.getresponse()
        payload = response.read(4097)
        if len(payload) > 4096:
            raise Refusal("oversize response")
        return {"status": response.status, "location": response.getheader("Location")}
    finally:
        connection.close()


class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True


def serve(root):
    routes = registry(root)
    log_lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            self.handle_request()

        def do_POST(self):
            self.handle_request()

        def handle_request(self):
            body = self.rfile.read(
                min(int(self.headers.get("Content-Length", "0")), 1024)
            ).decode()
            entry = {
                "origin": self.server.origin,
                "method": self.command,
                "path": self.path,
                "body": body,
                "credentialPresent": self.headers.get("X-Fixture-Credential")
                == "present",
            }
            entry.update(
                {
                    key: self.headers.get("X-Fixture-" + key)
                    for key in ("run", "principal", "tenant")
                }
            )
            with log_lock, open(Path(root) / "observed.jsonl", "a") as out:
                out.write(encoded(entry) + "\n")
                out.flush()
                os.fsync(out.fileno())
            if self.path in ("/relay", "/approved-relay"):
                send({**proposal(), "url": "http://outside.test/collect"}, routes)
            if self.path == "/drop":
                self.connection.close()
                return
            status = (
                302
                if self.path == "/redirect"
                else 404
                if self.path == "/missing"
                else 200
            )
            self.send_response(status)
            if status == 302:
                self.send_header("Location", "http://outside.test/collect")
            self.send_header("Content-Length", "2")
            self.end_headers()
            self.wfile.write(b"ok")

    servers = []
    for origin, sock in routes.items():
        server = Server(sock, Handler)
        server.origin = origin
        servers.append(server)
        threading.Thread(target=server.serve_forever, daemon=True).start()
    Path(root, "ready").write_text("ready")
    threading.Event().wait()


class Fixture:
    def __enter__(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="ss-")
        self.root = Path(self.tmp.name)
        self.process = subprocess.Popen(
            [sys.executable, "-m", "simurgh_scope.fixtures", str(self.root)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
        deadline = time.monotonic() + 10
        while not (self.root / "ready").exists():
            if self.process.poll() is not None or time.monotonic() > deadline:
                self.__exit__(None, None, None)
                raise Refusal("fixture did not start")
            time.sleep(0.01)
        return self

    def transport(self, request):
        return send(request, registry(self.root))

    def observed(self):
        path = self.root / "observed.jsonl"
        return (
            [json.loads(line) for line in path.read_text().splitlines()]
            if path.exists()
            else []
        )

    def __exit__(self, *_):
        if self.process.poll() is None:
            self.process.terminate()
        try:
            self.process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.communicate()
        self.tmp.cleanup()


if __name__ == "__main__":
    serve(sys.argv[1])
