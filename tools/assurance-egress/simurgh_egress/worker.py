"""Trusted fixture bootstrap; one approved inbound HTTP request then exit."""

import errno
import json
import os
import socket
import socketserver
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

from .kernel import Refusal, install, sanitize
from .probes import attempt, fork_probe


class InheritedServer(socketserver.UnixStreamServer):
    def __init__(self, listener, handler):
        # Do not create a new socket after applying the profile.
        socketserver.BaseServer.__init__(self, listener.getsockname(), handler)
        self.socket = listener


def main():
    config = json.loads(Path(sys.argv[1]).read_text())
    listener_fd = config["listener"]
    sanitize(listener_fd)
    closed = None
    if config["case"] == "inherited_socket":
        try:
            os.fstat(config["leaked_fd"])
            raise Refusal("inherited connected socket survived bootstrap")
        except OSError as exc:
            if exc.errno != errno.EBADF:
                raise
            closed = {"outcome": "closed", "errno": "EBADF"}
    if config["control"] == "kernel":
        install()
    elif config["control"] != "unfiltered":
        raise Refusal("invalid running control")
    listener = socket.socket(fileno=listener_fd)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            self.handle_request()

        def do_POST(self):
            self.handle_request()

        def handle_request(self):
            case = config["case"]
            if case == "public_read":
                result = {"outcome": "useful", "errno": None}
            elif case == "approved_write":
                body = self.rfile.read(int(self.headers["Content-Length"]))
                if body != b"approved":
                    raise Refusal("unexpected approved body")
                Path(config["approved_file"]).write_bytes(body)
                result = {"outcome": "useful", "errno": None}
            elif case == "inherited_socket":
                result = closed
            elif case in ("fork_relay", "exec_relay"):
                result = fork_probe(config["probe"], execute=case == "exec_relay")
            else:
                result = attempt(config["probe"])
            data = json.dumps(result).encode()
            self.send_response(
                503
                if result["outcome"] in ("blocked", "closed")
                else 200
                if result["outcome"] in ("delivered", "useful")
                else 502
            )
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = InheritedServer(listener, Handler)
    print(json.dumps({"ready": True, "profile": config["control"]}), flush=True)
    server.handle_request()
    server.server_close()


if __name__ == "__main__":
    try:
        main()
    except (Refusal, OSError, ValueError) as exc:
        print("worker refused: " + str(exc), file=sys.stderr)
        raise SystemExit(1) from exc
