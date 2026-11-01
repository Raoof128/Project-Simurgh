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
            self.assertEqual(
                p.decide({"url": "http://receiver.example/report", "role": "intern"})[
                    "decision"
                ],
                "role_not_allowed",
            )
            self.assertEqual(
                p.decide({"url": "http://mirror.example/report"})["decision"],
                "destination_not_allowed",
            )
            self.assertEqual(p.decide("garbage")["decision"], "malformed")
        finally:
            p.close()


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
