"""Phase 19d: namespace launcher, parent-owned proxy and network-layer canary (design §4.4).

Linux only. The worker runs under ``unshare --user --map-root-user --net`` and so has loopback
only; its one sanctioned route is the parent's proxy over a Unix socket, which the filesystem
carries across namespaces and TCP does not. The proxy canonicalises the destination, follows
redirects itself, applies the parent-owned destination and role allowlists, and forwards only to
the owned receiver on the parent's loopback. The canary is the namespace's own kernel counters
(``/proc/<pid>/net/snmp``) read before and after a case, beside the proxy's decision log.

Bound: one namespace on one host. Covert channels are out of scope beyond one measured probe.
A host that cannot create the namespace gets ``host_cannot_namespace`` and no evidence.
"""

import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

UNSHARE = ["unshare", "--user", "--map-root-user", "--net"]
DECISIONS = (
    "forwarded",
    "destination_not_allowed",
    "final_destination_not_allowed",
    "host_header_mismatch",
    "role_not_allowed",
    "redirect_limit",
    "malformed",
)
ENETUNREACH = 101


def can_namespace():
    if platform.system() != "Linux" or shutil.which("unshare") is None:
        return False
    try:
        return (
            subprocess.run(
                [*UNSHARE, "true"], capture_output=True, timeout=10
            ).returncode
            == 0
        )
    except (OSError, subprocess.SubprocessError):
        return False


def in_namespace(argv, *, env=None, timeout=60):
    """Run ``argv`` inside a fresh user+net namespace; return (returncode, stdout, stderr)."""
    proc = subprocess.run(
        [*UNSHARE, *argv],
        capture_output=True,
        text=True,
        timeout=timeout,
        env={
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "LC_ALL": "C.UTF-8",
            **(env or {}),
        },
    )
    return proc.returncode, proc.stdout, proc.stderr


COUNTER_SCRIPT = r"""
import json
def snmp():
    out = {}
    lines = open("/proc/net/snmp").read().splitlines()
    for i in range(0, len(lines) - 1, 2):
        proto = lines[i].split(":")[0]
        keys = lines[i].split()[1:]; vals = lines[i + 1].split()[1:]
        out[proto] = dict(zip(keys, map(int, vals)))
    return {"Tcp.OutSegs": out["Tcp"]["OutSegs"], "Tcp.AttemptFails": out["Tcp"]["AttemptFails"],
            "Tcp.ActiveOpens": out["Tcp"]["ActiveOpens"], "Udp.OutDatagrams": out["Udp"]["OutDatagrams"]}
"""


def canonical_url(url):
    """Lower-case scheme and host, repeated percent-decoding of the path, dot-segment removal,
    default ports stripped, trailing slash normalised."""
    u = urllib.parse.urlsplit(url.strip())
    scheme = u.scheme.lower()
    host = (u.hostname or "").lower().rstrip(".")
    port = u.port
    if (
        port in (None, 80, 443)
        or (scheme == "http" and port == 80)
        or (scheme == "https" and port == 443)
    ):
        netloc = host
    else:
        netloc = f"{host}:{port}"
    path = u.path or "/"
    for _ in range(3):
        decoded = urllib.parse.unquote(path)
        if decoded == path:
            break
        path = decoded
    import posixpath

    path = "/" + posixpath.normpath(path).lstrip("/")
    if len(path) > 1:
        path = path.rstrip("/")
    return urllib.parse.urlunsplit((scheme, netloc, path, u.query, ""))


class Receiver:
    """Owned loopback receiver: records every forwarded request as an effect."""

    def __init__(self):
        self.effects = []
        outer = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_GET(self):
                outer.effects.append({"method": "GET", "path": self.path})
                body = b'{"status":"observed"}'
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            do_POST = do_GET

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.port = self.server.server_port
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class Proxy:
    """Parent-owned proxy on a Unix socket. Request line format (one JSON object per connection):
    {"url": ..., "host_header": ..., "method": ..., "role": ...}. Replies with a JSON decision."""

    def __init__(
        self, path, *, allowed, roles, redirects, receiver_port, max_redirects=4
    ):
        self.path = Path(path)
        self.allowed = {canonical_url(u) for u in allowed}
        self.roles = roles  # canonical url -> set of allowed roles
        self.redirects = {
            canonical_url(k): v for k, v in redirects.items()
        }  # short -> target
        self.receiver_port = receiver_port
        self.max_redirects = max_redirects
        self.log = []
        self.sock = socket.socket(socket.AF_UNIX)
        self.sock.bind(str(self.path))
        self.sock.listen(16)
        self._stop = False
        threading.Thread(target=self._serve, daemon=True).start()

    def decide(self, request):
        try:
            url = canonical_url(request["url"])
            host_header = request.get("host_header")
            role = request.get("role", "worker")
        except (KeyError, TypeError, ValueError, AttributeError):
            return {"decision": "malformed"}
        hops = 0
        while url in self.redirects:
            hops += 1
            if hops > self.max_redirects:
                return {"decision": "redirect_limit", "final": url}
            url = canonical_url(self.redirects[url])
        if url not in self.allowed:
            return {
                "decision": "final_destination_not_allowed"
                if hops
                else "destination_not_allowed",
                "final": url,
            }
        host = urllib.parse.urlsplit(url).hostname
        if host_header is not None and host_header.lower() != host:
            return {"decision": "host_header_mismatch", "final": url}
        if role not in self.roles.get(url, {"worker"}):
            return {"decision": "role_not_allowed", "final": url}
        return {"decision": "forwarded", "final": url}

    def _serve(self):
        while not self._stop:
            try:
                conn, _ = self.sock.accept()
            except OSError:
                return
            try:
                raw = conn.recv(16384).decode("utf-8", "replace")
                try:
                    request = json.loads(raw)
                except ValueError:
                    request = None
                verdict = self.decide(request)
                if verdict["decision"] == "forwarded":
                    import urllib.request

                    req = urllib.request.Request(
                        f"http://127.0.0.1:{self.receiver_port}{urllib.parse.urlsplit(verdict['final']).path}",
                        method=request.get("method", "GET"),
                        data=b"" if request.get("method") == "POST" else None,
                    )
                    with urllib.request.urlopen(req, timeout=5) as r:
                        verdict["receiver_status"] = r.status
                self.log.append({"request": request, **verdict})
                conn.sendall(json.dumps(verdict).encode())
            except OSError:
                pass
            finally:
                conn.close()

    def close(self):
        self._stop = True
        try:
            self.sock.close()
        finally:
            self.path.unlink(missing_ok=True)


WORKER_SCRIPT = (
    r"""
import json, socket, sys, os
spec = json.loads(sys.argv[1])
"""
    + COUNTER_SCRIPT
    + r"""
def routes():
    lines = open("/proc/net/route").read().splitlines()[1:]
    return [l.split()[0] for l in lines if l.strip()]
before = snmp()
result = {"kind": spec["kind"], "routes": routes()}
if spec["kind"] == "loopback_probe":
    # anti-vacuity: a listener inside this namespace proves the counter reader is live.
    # A fresh namespace has lo DOWN; bring it up with the interface ioctl (we are root here).
    import fcntl, struct
    SIOCGIFFLAGS, SIOCSIFFLAGS, IFF_UP = 0x8913, 0x8914, 0x1
    ctl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    ifr = struct.pack("16sH14s", b"lo", 0, b"\0" * 14)
    flags = struct.unpack("16sH14s", fcntl.ioctl(ctl, SIOCGIFFLAGS, ifr))[1]
    fcntl.ioctl(ctl, SIOCSIFFLAGS, struct.pack("16sH14s", b"lo", flags | IFF_UP, b"\0" * 14))
    ctl.close()
    result["routes_after_lo_up"] = routes()
    srv = socket.socket(); srv.bind(("127.0.0.1", 0)); srv.listen(1)
    c = socket.socket(); c.connect(srv.getsockname()); a, _ = srv.accept(); c.sendall(b"x"); a.recv(1)
    c.close(); a.close(); srv.close(); result["connected"] = True
elif spec["kind"] == "proxy":
    s = socket.socket(socket.AF_UNIX); s.settimeout(10); s.connect(spec["socket"])
    s.sendall(json.dumps(spec["request"]).encode()); result["reply"] = json.loads(s.recv(16384).decode()); s.close()
elif spec["kind"] == "direct":
    s = socket.socket(); s.settimeout(3)
    try:
        s.connect((spec["host"], spec["port"])); result["connected"] = True
    except OSError as e:
        result["connected"] = False; result["errno"] = e.errno; result["error"] = type(e).__name__
    finally:
        s.close()
elif spec["kind"] == "config_rewrite":
    open(spec["config"], "w").write(json.dumps({"tool_server": spec["new_destination"]}))
    s = socket.socket(socket.AF_UNIX); s.settimeout(10); s.connect(spec["socket"])
    s.sendall(json.dumps(spec["request"]).encode()); result["reply"] = json.loads(s.recv(16384).decode()); s.close()
after = snmp()
result["ifaces"] = sorted(os.listdir("/sys/class/net"))
result["counters_before"] = before; result["counters_after"] = after
result["counter_delta"] = {k: after[k] - before[k] for k in before}
print(json.dumps(result))
"""
)


def run_worker(spec):
    code, out, err = in_namespace(
        [sys.executable, "-c", WORKER_SCRIPT, json.dumps(spec)]
    )
    if code != 0:
        raise RuntimeError(f"worker_failed:{code}:{err[:400]}")
    return json.loads(out.strip().splitlines()[-1])
