"""Owned loopback inbox fixture: authenticated RPC and atomic idempotent effects.

This is a research connector, not an Internet-facing mail server. The parent and
receiver bootstrap are trusted; the worker never receives this credential.
"""

import hmac
import json
import secrets
import select
import sqlite3
import subprocess
import sys
from http.client import HTTPException
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from core import decode, encode, valid


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Client:
    def __init__(self, url, token):
        self.url, self.token = url, token

    def rpc(self, path, body=None):
        request = Request(
            self.url + path,
            data=encode(body).encode() if body is not None else None,
            headers={
                "Authorization": "Bearer " + self.token,
                "Content-Type": "application/json",
            },
        )
        try:
            with build_opener(ProxyHandler({}), NoRedirect()).open(
                request, timeout=3
            ) as response:
                if response.status != 200:
                    raise ValueError("receiver_failure")
                return decode(response.read(16385))
        except (HTTPError, HTTPException, RecursionError) as exc:
            raise ValueError("receiver_rejected") from exc

    def send(self, key, action):
        return self.rpc("/inbox", {"key": key, "action": action})

    def lookup(self, key):
        return self.rpc("/inbox/" + key)


class Receiver:
    def __init__(self, path):
        self.path = Path(path)
        token = secrets.token_urlsafe(32)
        self.process = subprocess.Popen(
            [
                sys.executable,
                "-B",
                "-E",
                "-s",
                str(Path(__file__).resolve()),
                str(path),
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={"LC_ALL": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
        )
        try:
            self.process.stdin.write(token + "\n")
            self.process.stdin.flush()
            if not select.select([self.process.stdout], [], [], 5)[0]:
                raise RuntimeError("receiver_start_timeout")
            address = decode(self.process.stdout.readline())
            self.client = Client("http://127.0.0.1:" + str(address["port"]), token)
        except BaseException:
            self.close()
            raise

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
        self.process.communicate(timeout=5)


def serve(path, token):
    with sqlite3.connect(path) as db:
        db.execute(
            "CREATE TABLE IF NOT EXISTS inbox(key TEXT PRIMARY KEY, payload TEXT NOT NULL)"
        )

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            self.handle_request(False)

        def do_POST(self):
            self.handle_request(True)

        def handle_request(self, writing):
            self.connection.settimeout(3)
            if not hmac.compare_digest(
                self.headers.get("Authorization", ""), "Bearer " + token
            ):
                self.send_error(403)
                return
            try:
                with sqlite3.connect(path, timeout=5) as db:
                    if writing:
                        length = int(self.headers.get("Content-Length", "0"))
                        if self.path != "/inbox" or not 0 < length <= 16384:
                            raise ValueError("invalid_request")
                        request = decode(self.rfile.read(length))
                        if type(request) is not dict or set(request) != {
                            "key",
                            "action",
                        }:
                            raise ValueError("invalid_request")
                        key, action = request["key"], request["action"]
                        if not valid(action):
                            raise ValueError("invalid_action")
                    else:
                        key = self.path.removeprefix("/inbox/")
                    if (
                        type(key) is not str
                        or len(key) != 64
                        or any(c not in "0123456789abcdef" for c in key)
                    ):
                        raise ValueError("invalid_key")
                    db.execute("BEGIN IMMEDIATE")
                    row = db.execute(
                        "SELECT payload FROM inbox WHERE key=?", (key,)
                    ).fetchone()
                    if writing:
                        payload = encode(action)
                        if row and row[0] != payload:
                            raise ValueError("idempotency_conflict")
                        db.execute(
                            "INSERT OR IGNORE INTO inbox VALUES(?,?)", (key, payload)
                        )
                        row = (payload,)
                    reply = {"key": key, "action": decode(row[0]) if row else None}
                body = encode(reply).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (ValueError, TypeError, OSError):
                self.send_error(400)

    server = HTTPServer(("127.0.0.1", 0), Handler)
    print(json.dumps({"port": server.server_port}), flush=True)
    server.serve_forever()


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    serve(sys.argv[1], sys.stdin.readline().strip())
