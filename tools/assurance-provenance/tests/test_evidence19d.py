import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import egress19  # noqa: E402
import evidence19d as ev  # noqa: E402
import projection  # noqa: E402


class OffHostTests(unittest.TestCase):
    @unittest.skipIf(
        egress19.can_namespace(), "refusal test is for hosts that cannot namespace"
    )
    def test_run_refuses_off_linux(self):
        with self.assertRaises(RuntimeError) as ctx:
            ev.run(Path(tempfile.mkdtemp()) / "out")
        self.assertEqual(str(ctx.exception), "host_cannot_namespace")


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19d-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


def _synthetic_lane(host, outsegs, reachable):
    """A plausible lane report shaped like lanes19d.run_all's output, for compare/receipt tests."""
    import copy

    base = json.loads(
        (ev.ROOT / "docs/research/provenance-phase-19d/report.json").read_text()
    )["lane"]
    lane = copy.deepcopy(base)
    lane["host"] = host
    lane["live_reader_control"]["counter_delta"]["Tcp.OutSegs"] = outsegs
    lane["covert_probe"]["seconds"] = 0.5 if outsegs else 0.7
    lane["covert_probe"]["bits_per_second_observed"] = 123
    lane["namespace"]["confines"] = "IP routing only; test fixture"
    lane["unix_socket_probe"] = {
        "checked": list(egress19.WELL_KNOWN_SOCKETS),
        "results": {
            p: ("reachable" if p in reachable else "absent")
            for p in egress19.WELL_KNOWN_SOCKETS
        },
        "reachable": sorted(reachable),
        "eliminated": False,
        "note": "fixture",
    }
    for row in lane["rows"]:
        row.pop("receiver_port", None)
    return lane


class CompareAndReceiptTests(unittest.TestCase):
    """Runs on any host: the lane is replaced by a synthetic report so the comparison and the
    receipt derivation are tested where namespaces are unavailable (P19-REPAIR03)."""

    def setUp(self):
        self.saved_ns = egress19.can_namespace
        self.saved_run = ev.lanes19d.run_all
        egress19.can_namespace = lambda: True
        self.addCleanup(setattr, egress19, "can_namespace", self.saved_ns)
        self.addCleanup(setattr, ev.lanes19d, "run_all", self.saved_run)
        self.tmp = tempfile.TemporaryDirectory(prefix="p19d-synth-")
        self.addCleanup(self.tmp.cleanup)
        author = _synthetic_lane(
            {"system": "Linux", "release": "7.0.14-linuxkit", "machine": "aarch64"},
            8,
            [],
        )
        ev.lanes19d.run_all = lambda base: json.loads(json.dumps(author))
        self.out = Path(self.tmp.name) / "out"
        ev.run(self.out)
        self.root = (self.out / "ROOT.sha256").read_text().strip()
        self.proto = self.out / "protocol.json"

    def _verify_as(self, lane):
        ev.lanes19d.run_all = lambda base: json.loads(json.dumps(lane))
        return ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)

    def test_receipt_describes_the_verifying_host(self):
        droplet = _synthetic_lane(
            {"system": "Linux", "release": "6.8.0-134-generic", "machine": "x86_64"},
            0,
            ["/var/run/docker.sock", "/run/systemd/resolve/io.systemd.Resolve"],
        )
        r = self._verify_as(droplet)
        self.assertIs(r["verified"], True)
        self.assertEqual(r["host"]["machine"], "x86_64")
        self.assertIs(r["live_reader_moved"], False)
        self.assertEqual(
            r["unix_sockets_reachable"],
            ["/run/systemd/resolve/io.systemd.Resolve", "/var/run/docker.sock"],
        )
        self.assertIs(r["unix_socket_egress_eliminated"], False)
        self.assertIn("unix_socket_probe.reachable", r["reported_not_compared"])

    def test_substantive_differences_are_rejected(self):
        other = _synthetic_lane(
            {"system": "Linux", "release": "x", "machine": "x86_64"}, 8, []
        )
        other["rows"][1]["decision"] = "forwarded"
        with self.assertRaises(ValueError) as ctx:
            self._verify_as(other)
        self.assertTrue(
            str(ctx.exception).startswith("case_mismatch"), str(ctx.exception)
        )
        other = _synthetic_lane(
            {"system": "Linux", "release": "x", "machine": "x86_64"}, 8, []
        )
        other["covert_probe"]["eliminated"] = True
        with self.assertRaises(ValueError) as ctx:
            self._verify_as(other)
        self.assertEqual(str(ctx.exception), "report_mismatch")
        other = _synthetic_lane(
            {"system": "Linux", "release": "x", "machine": "x86_64"}, 8, []
        )
        other["proxy_log"] = []
        with self.assertRaises(ValueError) as ctx:
            self._verify_as(other)
        self.assertEqual(str(ctx.exception), "report_mismatch")


@unittest.skipUnless(
    egress19.can_namespace(), "Linux user+net namespace not available on this host"
)
class Evidence19dTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19d-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["cases"], 11)
        self.assertIs(r["unix_socket_egress_eliminated"], False)
        self.assertGreater(r["covert_probe_bytes_delivered"], 0)
        self.assertIsInstance(r["unix_sockets_reachable"], list)
        self.assertIs(r["all_hold"], True)
        self.assertEqual(r["receiver_effects"], 1)
        self.assertEqual(r["routes_in_fresh_namespace"], [])
        self.assertIs(r["live_reader_moved"], True)
        self.assertIs(r["covert_channel_eliminated"], False)
        self.assertEqual(r["host"]["system"], "Linux")

    def test_verify_round_trip(self):
        self.assertIs(
            ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)[
                "verified"
            ],
            True,
        )

    def _reject(self, mutate, reason):
        pack, root = repack(self.out / "evidence.zip", mutate)
        with self.assertRaises(ValueError) as ctx:
            ev.verify(pack, root, protocol=self.proto)
        self.assertTrue(str(ctx.exception).startswith(reason), str(ctx.exception))

    def test_mutations(self):
        def drop(files):
            rep = json.loads(files["report.json"])
            rep["comparable_rows"].pop()
            files["report.json"] = projection.wire(rep)

        def relabel(files):
            rep = json.loads(files["report.json"])
            rep["comparable_rows"][1]["decision"] = "forwarded"
            files["report.json"] = projection.wire(rep)

        def hold(files):
            rep = json.loads(files["report.json"])
            rep["lane"]["all_hold"] = False
            files["report.json"] = projection.wire(rep)

        self._reject(drop, "row_inventory")
        self._reject(relabel, "case_mismatch:")
        self._reject(hold, "hold_mismatch")


if __name__ == "__main__":
    unittest.main()
