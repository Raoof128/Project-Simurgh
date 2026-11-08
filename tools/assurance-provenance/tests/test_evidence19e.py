import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

import evidence19e as ev  # noqa: E402
import projection  # noqa: E402


def repack(src, mutate):
    with zipfile.ZipFile(src) as z:
        files = {n: z.read(n) for n in z.namelist() if n != "manifest.json"}
    mutate(files)
    dst = Path(tempfile.mkdtemp(prefix="p19e-mut-")) / "evidence.zip"
    return dst, projection.write_pack(dst, files)


class Evidence19eTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="p19e-ev-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.out = Path(cls.temp.name) / "out"
        cls.receipt = ev.run(cls.out)
        cls.root = (cls.out / "ROOT.sha256").read_text().strip()
        cls.proto = cls.out / "protocol.json"

    def test_receipt(self):
        r = self.receipt
        self.assertIs(r["verified"], True)
        self.assertIs(r["model_inference"], False)
        self.assertEqual(r["spend"], 0)
        self.assertEqual(r["capture_status"], "not_run")
        self.assertEqual(r["framed_messages"], 144)
        self.assertIs(r["scripted_control"]["evaluable"], True)
        self.assertIs(r["scripted_control"]["recovered"], True)
        self.assertEqual(r["informed_attacker"], "not_run")

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
        def edit(fn):
            def mutate(files):
                rep = json.loads(files["report.json"])
                fn(rep)
                files["report.json"] = projection.wire(rep)
                for name, project in ev.SIDECARS.items():
                    files[name] = projection.wire(project(rep))

            return mutate

        def drop(rep):
            rep["framings"].pop()

        def flip(rep):
            row = rep["scripted"]["generations"][0]
            row["emitted"] = not row["emitted"]

        def claim(rep):
            rep["spend"]["status"] = "complete"

        self._reject(edit(drop), "framing_inventory")
        self._reject(edit(flip), "scripted_mismatch")
        self._reject(edit(claim), "capture_claimed")

        # P19-REPAIR03: the declaration is bound, and the receipt comes from the recomputation
        def cap(rep):
            rep["spend"]["budget_cap_generations"] = 10**9

        def granted(rep):
            rep["spend"]["authorisation"] = "granted"

        def attacker(rep):
            rep["informed_attacker"]["source_digests"] = {"gate19.py": "0" * 64}

        self._reject(edit(cap), "report_mismatch")
        self._reject(edit(granted), "report_mismatch")
        self._reject(edit(attacker), "report_mismatch")


if __name__ == "__main__":
    unittest.main()
