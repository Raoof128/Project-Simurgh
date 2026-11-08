"""Phase 19d: namespace launcher, parent-owned proxy and network-layer canary (design §4.4).

Linux only. The worker runs under ``unshare --user --map-root-user --net --mount --pid --fork
--ipc`` with a private tmpfs over ``/run`` and ``/dev/shm`` and every capability but
``CAP_NET_ADMIN`` dropped (P19-REPAIR04), and so has loopback only and no daemon socket in sight;
its one sanctioned route is the parent's proxy over a Unix socket in the lane's own work directory,
which the filesystem carries across namespaces and TCP does not. The proxy canonicalises the destination, follows
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

UNSHARE = [
    "unshare",
    "--user",
    "--map-root-user",
    "--net",
    "--mount",
    "--pid",
    "--fork",
    "--ipc",
]
# Inside the namespaces, before the worker starts: hide the runtime socket directories behind a
# private tmpfs, then drop every capability except CAP_NET_ADMIN (the live-reader control brings
# loopback up). The work directory stays shared by design: that is the measured covert channel.
HARDEN = (
    "mount -t tmpfs -o nosuid,nodev,noexec,size=1m none /run"
    " && mount -t tmpfs -o nosuid,nodev,noexec,size=1m none /dev/shm"
    " && exec setpriv --bounding-set=-all,+net_admin --inh-caps=-all,+net_admin"
    ' --ambient-caps=+net_admin "$@"'
)
DECISIONS = (
    "forwarded",
    "forward_failed",
    "destination_not_allowed",
    "final_destination_not_allowed",
    "host_header_mismatch",
    "role_not_allowed",
    "method_not_allowed",
    "redirect_limit",
    "malformed",
)
ENETUNREACH = 101
REQUEST_FIELDS = {"url", "host_header", "method"}
METHODS = ("GET", "POST")
RECV_CAP = 16384
# filesystem-reachable Unix sockets a network namespace does not confine; probed and reported
WELL_KNOWN_SOCKETS = (
    "/var/run/docker.sock",
    "/run/docker.sock",
    "/run/systemd/resolve/io.systemd.Resolve",
    "/run/dbus/system_bus_socket",
    "/run/systemd/journal/socket",
    "/var/run/nscd/socket",
    "/run/containerd/containerd.sock",
    "/run/podman/podman.sock",
)


def _strict_pairs(pairs):
    keys = [k for k, _ in pairs]
    if len(keys) != len(set(keys)):
        raise ValueError("duplicate_key")
    return dict(pairs)


def _reject_constant(name):
    raise ValueError("non_finite:" + name)


def decode_request(raw):
    """Strict JSON for the proxy line: one object, no duplicate keys, no NaN/Infinity, only the
    declared fields with string values. Anything else is ``None`` (``malformed``)."""
    try:
        value = json.loads(
            raw, object_pairs_hook=_strict_pairs, parse_constant=_reject_constant
        )
    except (ValueError, TypeError, RecursionError):
        return None
    if type(value) is not dict or not set(value) <= REQUEST_FIELDS:
        return None
    if any(type(v) is not str for v in value.values()):
        return None
    if "url" not in value:
        return None
    return value


def can_namespace():
    """True only where the whole hardened launch works: user, net, mount, pid and ipc namespaces,
    the tmpfs mounts and ``setpriv``."""
    if platform.system() != "Linux" or not all(
        shutil.which(t) for t in ("unshare", "setpriv")
    ):
        return False
    try:
        return in_namespace(["true"], timeout=10)[0] == 0
    except (OSError, subprocess.SubprocessError):
        return False


def in_namespace(argv, *, env=None, timeout=60):
    """Run ``argv`` inside a fresh user+net namespace; return (returncode, stdout, stderr)."""
    proc = subprocess.run(
        [*UNSHARE, "sh", "-c", HARDEN, "harden", *argv],
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
    """Lower-case scheme and host, percent-decoding of the path to a fixed point, dot-segment
    removal, the scheme's own default port stripped (and no other), IPv6 brackets kept, trailing
    slash normalised. Raises ``ValueError`` for shapes no fetcher agrees on (userinfo, a backslash,
    an undecodable path)."""
    if "\\" in url:
        raise ValueError("backslash")
    u = urllib.parse.urlsplit(url.strip())
    if "@" in u.netloc:
        raise ValueError("userinfo")
    scheme = u.scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError("scheme")
    host = (u.hostname or "").lower().rstrip(".")
    if not host:
        raise ValueError("host")
    if ":" in host:
        host = "[" + host + "]"
    port = u.port
    default = 80 if scheme == "http" else 443
    netloc = host if port in (None, default) else f"{host}:{port}"
    path = u.path or "/"
    for _ in range(8):
        decoded = urllib.parse.unquote(path)
        if decoded == path:
            break
        path = decoded
    else:
        raise ValueError("path_not_fixed_point")
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
        self,
        path,
        *,
        allowed,
        roles,
        redirects,
        receiver_port,
        max_redirects=4,
        socket_role="worker",
    ):
        self.path = Path(path)
        self.allowed = {canonical_url(u) for u in allowed}
        self.roles = roles  # canonical url -> set of allowed roles
        # the role is a property of the socket the proxy serves, never a field of the request
        # (P19-REPAIR03): a worker cannot declare itself an operator
        self.socket_role = socket_role
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
        if (
            type(request) is not dict
            or not set(request) <= REQUEST_FIELDS
            or "url" not in request
            or any(type(v) is not str for v in request.values())
        ):
            return {"decision": "malformed"}
        try:
            url = canonical_url(request["url"])
        except (ValueError, TypeError, AttributeError, IndexError):
            return {"decision": "malformed"}
        host_header = request.get("host_header")
        role = self.socket_role
        if request.get("method", "GET") not in METHODS:
            return {"decision": "method_not_allowed", "final": url}
        hops = 0
        while url in self.redirects:
            hops += 1
            if hops > self.max_redirects:
                return {"decision": "redirect_limit", "final": url}
            try:
                url = canonical_url(self.redirects[url])
            except ValueError:
                return {"decision": "malformed"}
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
            request = None
            verdict = {"decision": "malformed"}
            try:
                conn.settimeout(5)
                raw = conn.recv(RECV_CAP).decode("utf-8", "replace")
                request = decode_request(raw)
                verdict = self.decide(request)
                if verdict["decision"] == "forwarded":
                    verdict = self._forward(request, verdict)
            except Exception as exc:  # a hostile line is a decision, never a dead loop
                verdict = {"decision": "malformed", "error": type(exc).__name__}
            finally:
                self.log.append({"request": request, **verdict})
                try:
                    conn.sendall(json.dumps(verdict).encode())
                except OSError:
                    pass
                conn.close()

    def _forward(self, request, verdict):
        import urllib.request

        method = request.get("method", "GET")
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.receiver_port}{urllib.parse.urlsplit(verdict['final']).path}",
            method=method,
            data=b"" if method == "POST" else None,
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return {**verdict, "receiver_status": r.status}
        except (OSError, ValueError) as exc:
            return {
                "decision": "forward_failed",
                "final": verdict["final"],
                "error": type(exc).__name__,
            }

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
