import json
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import egress19  # noqa: E402


class CanonicalTests(unittest.TestCase):
    def test_canonical_url(self):
        c = egress19.canonical_url
        self.assertEqual(
            c("HTTP://Receiver.Example:80/a/../b/%41/"), "http://receiver.example/b/A"
        )
        self.assertEqual(c("http://x.example/%2541"), "http://x.example/A")
        self.assertEqual(c("https://x.example:443/"), "https://x.example/")

    def test_decide_without_network(self):
        tmp = tempfile.mkdtemp()
        p = egress19.Proxy(
            Path(tmp) / "p.sock",
            allowed=["http://receiver.example/report"],
            roles={"http://receiver.example/report": {"worker"}},
            redirects={"http://sho.rt/x": "http://evil.example/"},
            receiver_port=1,
        )
        try:
            self.assertEqual(
                p.decide({"url": "http://RECEIVER.example/report"})["decision"],
                "forwarded",
            )
            self.assertEqual(
                p.decide({"url": "http://sho.rt/x"})["decision"],
                "final_destination_not_allowed",
            )
            self.assertEqual(
                p.decide(
                    {
                        "url": "http://receiver.example/report",
                        "host_header": "evil.example",
                    }
                )["decision"],
                "host_header_mismatch",
            )
            # a role is a property of the socket, never a request field (P19-REPAIR03)
            self.assertEqual(
                p.decide({"url": "http://receiver.example/report", "role": "intern"})[
                    "decision"
                ],
                "malformed",
            )
            self.assertEqual(
                p.decide({"url": "http://receiver.example/report", "method": "DELETE"})[
                    "decision"
                ],
                "method_not_allowed",
            )
            self.assertEqual(
                p.decide({"url": "http://receiver.example/report", "host_header": 5})[
                    "decision"
                ],
                "malformed",
            )
            self.assertEqual(
                p.decide({"url": "http://evil.example\\@receiver.example/report"})[
                    "decision"
                ],
                "malformed",
            )
            self.assertEqual(
                p.decide({"url": "http://mirror.example/report"})["decision"],
                "destination_not_allowed",
            )
            self.assertEqual(p.decide("garbage")["decision"], "malformed")
        finally:
            p.close()


class SocketRoleAndRobustnessTests(unittest.TestCase):
    """Runs on any POSIX host: the proxy's decision and serve loop need no namespace."""

    def _proxy(self, socket_role):
        tmp = tempfile.mkdtemp()
        receiver = egress19.Receiver()
        self.addCleanup(receiver.close)
        p = egress19.Proxy(
            Path(tmp) / "p.sock",
            allowed=["http://receiver.example/report", "http://ops.example/admin"],
            roles={egress19.canonical_url("http://ops.example/admin"): {"operator"}},
            redirects={},
            receiver_port=receiver.port,
            socket_role=socket_role,
        )
        self.addCleanup(p.close)
        return p, receiver

    def _ask(self, p, raw, timeout=8):  # above the proxy's own 5 s receive timeout
        import socket

        s = socket.socket(socket.AF_UNIX)
        s.settimeout(timeout)
        s.connect(str(p.path))
        try:
            try:
                s.sendall(raw if isinstance(raw, bytes) else json.dumps(raw).encode())
            except BrokenPipeError:
                pass  # the proxy may answer and close before a long line is fully sent
            return json.loads(s.recv(16384).decode())
        finally:
            s.close()

    def test_role_comes_from_the_socket(self):
        worker, receiver = self._proxy("worker")
        self.assertEqual(
            self._ask(worker, {"url": "http://ops.example/admin"})["decision"],
            "role_not_allowed",
        )
        self.assertEqual(
            self._ask(worker, {"url": "http://ops.example/admin", "role": "operator"})[
                "decision"
            ],
            "malformed",
        )
        self.assertEqual(receiver.effects, [])
        operator, receiver2 = self._proxy("operator")
        self.assertEqual(
            self._ask(operator, {"url": "http://ops.example/admin"})["decision"],
            "forwarded",
        )
        self.assertEqual(len(receiver2.effects), 1)

    def test_hostile_lines_are_decisions_and_the_loop_survives(self):
        p, receiver = self._proxy("worker")
        hostile = [
            b'{"url":"http://receiver.example/report","role":["x"]}',
            b'{"url":"http://receiver.example/report","host_header":5}',
            b'{"url":"http://receiver.example/report","method":"GET\r\nX: 1"}',
            b'{"url":"http://receiver.example/report","n":NaN}',
            b'{"url":"http://evil.example/","url":"http://receiver.example/report"}',
            b"garbage",
            b"[" * 20000,
            b"",
        ]
        for raw in hostile:
            self.assertEqual(self._ask(p, raw)["decision"], "malformed", raw[:40])
        self.assertEqual(
            self._ask(p, {"url": "http://receiver.example/report"})["decision"],
            "forwarded",
        )
        self.assertEqual(len(receiver.effects), 1)
        self.assertEqual(len(p.log), len(hostile) + 1)

    def test_method_is_allow_listed_and_bytes_are_not_a_channel(self):
        p, receiver = self._proxy("worker")
        for method in ("DELETE", "get", "SECRETDATA123", "X" * 3000):
            self.assertEqual(
                self._ask(
                    p, {"url": "http://receiver.example/report", "method": method}
                )["decision"],
                "method_not_allowed",
            )
        self.assertEqual(receiver.effects, [])

    def test_canonical_url_keeps_ipv6_brackets_and_scheme_ports(self):
        c = egress19.canonical_url
        self.assertEqual(c("http://[::1]:8080/x"), "http://[::1]:8080/x")
        self.assertNotEqual(c("http://[::1]:8080/x"), c("http://[::1:8080]/x"))
        self.assertEqual(c("https://x.example:80/x"), "https://x.example:80/x")
        self.assertEqual(c("http://x.example:443/x"), "http://x.example:443/x")
        with self.assertRaises(ValueError):
            c("http://allowed@evil.example/")
        with self.assertRaises(ValueError):
            c("ftp://x.example/")


@unittest.skipUnless(
    egress19.can_namespace(), "Linux user+net namespace not available on this host"
)
class NamespaceTests(unittest.TestCase):
    def test_namespace_has_no_route_and_direct_egress_fails_before_any_segment(self):
        out = egress19.run_worker({"kind": "direct", "host": "192.0.2.1", "port": 80})
        self.assertIn("lo", out["ifaces"])
        self.assertEqual(
            out["routes"], [], "a fresh network namespace must carry no route"
        )
        self.assertFalse(out["connected"])
        self.assertEqual(out["errno"], egress19.ENETUNREACH)
        # no route means no segment left: the canary is the absence, with the live reader proven below
        self.assertEqual(
            out["counter_delta"], {k: 0 for k in out["counter_delta"]}, out
        )

    def test_namespace_is_hardened(self):
        code, out, err = egress19.in_namespace(
            [
                "python3",
                "-c",
                "import os,json,stat\n"
                "def socks(d):\n"
                "    out=[]\n"
                "    for root,dirs,files in os.walk(d):\n"
                "        for f in files:\n"
                "            try:\n"
                "                if stat.S_ISSOCK(os.lstat(os.path.join(root,f)).st_mode): out.append(os.path.join(root,f))\n"
                "            except OSError: pass\n"
                "    return out\n"
                "print(json.dumps({'pid':os.getpid(),'run':socks('/run'),'shm':socks('/dev/shm'),"
                "'cap':open('/proc/self/status').read().split('CapEff:')[1].split()[0]}))",
            ]
        )
        self.assertEqual(code, 0, err)
        state = json.loads(out.strip().splitlines()[-1])
        self.assertEqual(state["pid"], 1)
        self.assertEqual(state["run"], [])  # no socket under the private /run
        self.assertEqual(state["shm"], [])
        self.assertEqual(int(state["cap"], 16), 1 << 12)  # CAP_NET_ADMIN only

    def test_counter_reader_is_live_inside_the_namespace(self):
        out = egress19.run_worker({"kind": "loopback_probe"})
        self.assertTrue(out["connected"])
        self.assertGreaterEqual(out["counter_delta"]["Tcp.ActiveOpens"], 1)
        self.assertGreaterEqual(out["counter_delta"]["Tcp.OutSegs"], 1)

    def test_proxy_reachable_over_unix_socket_and_counters_still(self):
        tmp = tempfile.mkdtemp()
        recv = egress19.Receiver()
        p = egress19.Proxy(
            Path(tmp) / "p.sock",
            allowed=["http://receiver.example/report"],
            roles={},
            redirects={},
            receiver_port=recv.port,
        )
        try:
            out = egress19.run_worker(
                {
                    "kind": "proxy",
                    "socket": str(Path(tmp) / "p.sock"),
                    "request": {
                        "url": "http://receiver.example/report",
                        "method": "GET",
                    },
                }
            )
            self.assertEqual(out["reply"]["decision"], "forwarded")
            self.assertEqual(out["reply"]["receiver_status"], 200)
            self.assertEqual(out["counter_delta"], {k: 0 for k in out["counter_delta"]})
            self.assertEqual(len(recv.effects), 1)
        finally:
            p.close()
            recv.close()


if __name__ == "__main__":
    unittest.main()
