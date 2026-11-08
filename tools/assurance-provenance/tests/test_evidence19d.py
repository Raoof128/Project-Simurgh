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
        self.assertEqual(r["cases"], 9)
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
