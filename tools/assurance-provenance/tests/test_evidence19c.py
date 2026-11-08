import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19c as ev  # noqa: E402
import projection  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19c-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19cTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19c-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertEqual(r["arm"], "receiver_direct_fork")
        self.assertEqual(r["new_reasons"], 8)
        self.assertEqual(r["route_variants"], 7)
        self.assertIs(r["strawman_admits_at_least_one"], True)
        self.assertIs(r["pays_G22"], False)
        self.assertIs(r["transport_forked"], False)
        self.assertIs(r["independent_custody"], False)

    def test_verify_round_trip(self):
        self.assertIs(
            ev.verify(self.out / "evidence.zip", self.root, protocol=self.proto)[
                "verified"
            ],
            True,
        )

    def test_protocol_pins(self):
        proto = json.loads(self.proto.read_text())
        for needle in (
            "tools/assurance-provenance/receiver19.py",
            "tools/assurance-provenance/lanes19c.py",
            "tools/assurance-credentials/service.py",
            "tools/assurance-connector/core.py",
        ):
            self.assertIn(needle, proto["sources"])
        self.assertNotIn("tools/assurance-provenance/lane.py", proto["sources"])

    def _reject(self, mutate, reason):
        pack, root = repack(self.out / "evidence.zip", mutate)
        with self.assertRaises(ValueError) as ctx:
            ev.verify(pack, root, protocol=self.proto)
        self.assertEqual(str(ctx.exception), reason)

    def test_mutations(self):
        def drop_row(files):
            rep = json.loads(files["report.json"])
            rep["lanes"]["credential"]["rows"].pop()
            files["report.json"] = projection.wire(rep)

        def relabel(files):
            rep = json.loads(files["report.json"])
            rep["lanes"]["credential"]["rows"][1]["fork"] = "observed"
            files["report.json"] = projection.wire(rep)

        def variant(files):
            rep = json.loads(files["report.json"])
            rep["lanes"]["route_corpus"]["variants"][0]["fork"] = "observed"
            files["report.json"] = projection.wire(rep)

        def cumulative(files):
            rep = json.loads(files["report.json"])
            rep["lanes"]["cumulative"]["rows"][2]["fork"] = "observed"
            files["report.json"] = projection.wire(rep)

        def manifest(files):
            rep = json.loads(files["report.json"])
            rep["lanes"]["manifest"]["rows"][1]["fork"] = "loaded"
            files["report.json"] = projection.wire(rep)

        self._reject(drop_row, "row_inventory")
        self._reject(relabel, "credential_mismatch")
        self._reject(variant, "route_mismatch")
        self._reject(cumulative, "cumulative_mismatch")
        self._reject(manifest, "manifest_mismatch")


if __name__ == "__main__":
    unittest.main()
